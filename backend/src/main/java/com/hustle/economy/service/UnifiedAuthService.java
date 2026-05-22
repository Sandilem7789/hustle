package com.hustle.economy.service;

import com.hustle.economy.dto.AuthRequest;
import com.hustle.economy.dto.UnifiedAuthResponse;
import com.hustle.economy.dto.UnifiedRegisterRequest;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UnifiedAuthService {

    private final AppUserRepository appUserRepository;
    private final AppUserSessionRepository appUserSessionRepository;
    private final CustomerRepository customerRepository;
    private final CustomerSessionRepository customerSessionRepository;
    private final HustlerApplicationRepository hustlerApplicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public UnifiedAuthResponse register(UnifiedRegisterRequest request) {
        String phone = normalizePhone(request.getPhone());
        if (appUserRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this phone number already exists");
        }

        // Discard email if it looks like a phone number (common user mistake)
        String email = (request.getEmail() != null && request.getEmail().contains("@"))
                ? request.getEmail() : null;

        AppUser user = appUserRepository.save(AppUser.builder()
                .phone(phone)
                .email(email)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER)))
                .build());

        // Also create a Customer record so existing customer endpoints still work
        Customer customer = customerRepository.findByPhone(phone).orElseGet(() ->
                customerRepository.save(Customer.builder()
                        .firstName(request.getFirstName())
                        .lastName(request.getLastName())
                        .phone(phone)
                        .email(email)
                        .passwordHash(user.getPasswordHash())
                        .createdAt(OffsetDateTime.now())
                        .build())
        );

        String appToken = generateToken();
        appUserSessionRepository.save(AppUserSession.builder()
                .token(appToken).user(user).createdAt(OffsetDateTime.now()).build());

        String customerToken = generateToken();
        customerSessionRepository.save(CustomerSession.builder()
                .token(customerToken).customer(customer).createdAt(OffsetDateTime.now()).build());

        return UnifiedAuthResponse.builder()
                .token(appToken)
                .customerToken(customerToken)
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .roles(List.of("CUSTOMER"))
                .build();
    }

    @Transactional
    public UnifiedAuthResponse login(AuthRequest request) {
        String phone = normalizePhone(request.getPhone());

        // 1. Check AppUser (new unified users)
        Optional<AppUser> appUserOpt = appUserRepository.findByPhone(phone);
        if (appUserOpt.isPresent()) {
            return loginAsAppUser(appUserOpt.get(), request.getPassword());
        }

        // 2. Fallback: existing Customer (registered before unified auth)
        Optional<Customer> customerOpt = customerRepository.findByPhone(phone);
        if (customerOpt.isPresent()) {
            return loginAsExistingCustomer(customerOpt.get(), request.getPassword());
        }

        // 3. Fallback: existing HustlerApplication (registered before unified auth)
        Optional<HustlerApplication> appOpt = hustlerApplicationRepository
                .findFirstByPhoneOrderBySubmittedAtDesc(phone);
        if (appOpt.isPresent()) {
            return loginAsExistingHustler(appOpt.get(), request.getPassword());
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No account found for this phone number");
    }

    @Transactional(readOnly = true)
    public AppUser requireAuth(String token) {
        return appUserSessionRepository.findByToken(token)
                .map(AppUserSession::getUser)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired session. Please log in again."));
    }

    // --- private helpers ---

    private UnifiedAuthResponse loginAsAppUser(AppUser user, String password) {
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }

        String appToken = generateToken();
        appUserSessionRepository.save(AppUserSession.builder()
                .token(appToken).user(user).createdAt(OffsetDateTime.now()).build());

        // Get or create a CustomerSession for customer-endpoint compatibility
        Customer customer = customerRepository.findByPhone(user.getPhone()).orElseGet(() ->
                customerRepository.save(Customer.builder()
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .phone(user.getPhone())
                        .email(user.getEmail())
                        .passwordHash(user.getPasswordHash())
                        .createdAt(OffsetDateTime.now())
                        .build())
        );
        String customerToken = generateToken();
        customerSessionRepository.save(CustomerSession.builder()
                .token(customerToken).customer(customer).createdAt(OffsetDateTime.now()).build());

        List<String> roles = user.getRoles().stream().map(Enum::name).sorted().collect(Collectors.toList());

        String businessProfileId = null;
        String businessName = null;
        String businessType = null;
        String applicationStatus = null;

        if (user.getRoles().contains(AppUserRole.HUSTLER)
                || user.getRoles().contains(AppUserRole.FACILITATOR)
                || user.getRoles().contains(AppUserRole.COORDINATOR)) {
            // Only look at APPROVED applications — avoids returning a PENDING test application
            Optional<HustlerApplication> ha = hustlerApplicationRepository
                    .findFirstByPhoneAndStatusOrderBySubmittedAtDesc(user.getPhone(), ApplicationStatus.APPROVED);
            if (ha.isPresent()) {
                Optional<BusinessProfile> bp = businessProfileRepository.findByApplication_Id(ha.get().getId());
                if (bp.isPresent()) {
                    businessProfileId = bp.get().getId().toString();
                    businessName = bp.get().getBusinessName();
                    businessType = bp.get().getBusinessType();
                }
            }
        } else {
            // Customer-only user: check if they have a pending hustler application
            boolean hasPending = hustlerApplicationRepository
                    .findFirstByPhoneAndStatusOrderBySubmittedAtDesc(user.getPhone(), ApplicationStatus.PENDING)
                    .isPresent();
            if (hasPending) applicationStatus = "PENDING";
        }

        return UnifiedAuthResponse.builder()
                .token(appToken)
                .customerToken(customerToken)
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .roles(roles)
                .businessProfileId(businessProfileId)
                .businessName(businessName)
                .businessType(businessType)
                .applicationStatus(applicationStatus)
                .build();
    }

    private UnifiedAuthResponse loginAsExistingCustomer(Customer customer, String password) {
        if (!passwordEncoder.matches(password, customer.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }

        // Migrate to AppUser
        AppUser user = appUserRepository.save(AppUser.builder()
                .phone(customer.getPhone())
                .email(customer.getEmail())
                .firstName(customer.getFirstName())
                .lastName(customer.getLastName())
                .passwordHash(customer.getPasswordHash())
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER)))
                .build());

        String appToken = generateToken();
        appUserSessionRepository.save(AppUserSession.builder()
                .token(appToken).user(user).createdAt(OffsetDateTime.now()).build());

        String customerToken = generateToken();
        customerSessionRepository.save(CustomerSession.builder()
                .token(customerToken).customer(customer).createdAt(OffsetDateTime.now()).build());

        return UnifiedAuthResponse.builder()
                .token(appToken)
                .customerToken(customerToken)
                .userId(user.getId().toString())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phone(user.getPhone())
                .roles(List.of("CUSTOMER"))
                .build();
    }

    private UnifiedAuthResponse loginAsExistingHustler(HustlerApplication application, String password) {
        if (application.getPasswordHash() == null
                || !passwordEncoder.matches(password, application.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }
        if (application.getStatus() == ApplicationStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your application was not approved");
        }
        if (application.getStatus() == ApplicationStatus.PENDING) {
            // Allow login as a CUSTOMER so they can browse the marketplace while awaiting approval
            AppUser user = appUserRepository.findByPhone(application.getPhone()).orElseGet(() -> {
                AppUser newUser = appUserRepository.save(AppUser.builder()
                        .phone(application.getPhone())
                        .email(application.getEmail())
                        .firstName(application.getFirstName())
                        .lastName(application.getLastName())
                        .passwordHash(application.getPasswordHash())
                        .createdAt(OffsetDateTime.now())
                        .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER)))
                        .build());
                // Link the application to this AppUser so decide() can grant HUSTLER role on approval
                application.setAppUser(newUser);
                hustlerApplicationRepository.save(application);
                return newUser;
            });

            String appToken = generateToken();
            appUserSessionRepository.save(AppUserSession.builder()
                    .token(appToken).user(user).createdAt(OffsetDateTime.now()).build());

            Customer customer = customerRepository.findByPhone(application.getPhone()).orElseGet(() ->
                    customerRepository.save(Customer.builder()
                            .firstName(application.getFirstName())
                            .lastName(application.getLastName())
                            .phone(application.getPhone())
                            .email(application.getEmail())
                            .passwordHash(application.getPasswordHash())
                            .createdAt(OffsetDateTime.now())
                            .build())
            );
            String customerToken = generateToken();
            customerSessionRepository.save(CustomerSession.builder()
                    .token(customerToken).customer(customer).createdAt(OffsetDateTime.now()).build());

            return UnifiedAuthResponse.builder()
                    .token(appToken)
                    .customerToken(customerToken)
                    .userId(user.getId().toString())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .phone(user.getPhone())
                    .roles(List.of("CUSTOMER"))
                    .applicationStatus("PENDING")
                    .build();
        }

        BusinessProfile profile = businessProfileRepository.findByApplication_Id(application.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Business profile not found"));

        UserRole legacyRole = application.getRole() != null ? application.getRole() : UserRole.HUSTLER;
        Set<AppUserRole> appRoles = new HashSet<>(Set.of(AppUserRole.CUSTOMER, toAppRole(legacyRole)));

        // Migrate to AppUser
        AppUser user = appUserRepository.save(AppUser.builder()
                .phone(application.getPhone())
                .email(application.getEmail())
                .firstName(application.getFirstName())
                .lastName(application.getLastName())
                .passwordHash(application.getPasswordHash())
                .createdAt(OffsetDateTime.now())
                .roles(appRoles)
                .build());

        String appToken = generateToken();
        appUserSessionRepository.save(AppUserSession.builder()
                .token(appToken).user(user).createdAt(OffsetDateTime.now()).build());

        // Create a CustomerSession so the old customer endpoints also work
        Customer customer = customerRepository.findByPhone(application.getPhone()).orElseGet(() ->
                customerRepository.save(Customer.builder()
                        .firstName(application.getFirstName())
                        .lastName(application.getLastName())
                        .phone(application.getPhone())
                        .email(application.getEmail())
                        .passwordHash(application.getPasswordHash())
                        .createdAt(OffsetDateTime.now())
                        .build())
        );
        String customerToken = generateToken();
        customerSessionRepository.save(CustomerSession.builder()
                .token(customerToken).customer(customer).createdAt(OffsetDateTime.now()).build());

        List<String> roles = appRoles.stream().map(Enum::name).sorted().collect(Collectors.toList());

        return UnifiedAuthResponse.builder()
                .token(appToken)
                .customerToken(customerToken)
                .userId(user.getId().toString())
                .firstName(application.getFirstName())
                .lastName(application.getLastName())
                .phone(application.getPhone())
                .roles(roles)
                .businessProfileId(profile.getId().toString())
                .businessName(profile.getBusinessName())
                .businessType(profile.getBusinessType())
                .build();
    }

    private AppUserRole toAppRole(UserRole legacy) {
        return switch (legacy) {
            case FACILITATOR -> AppUserRole.FACILITATOR;
            case COORDINATOR -> AppUserRole.COORDINATOR;
            default -> AppUserRole.HUSTLER;
        };
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * Normalises South African phone numbers to local 10-digit format (0XXXXXXXXX).
     * Handles: +27XXXXXXXXX → 0XXXXXXXXX, 27XXXXXXXXX → 0XXXXXXXXX, strips spaces/dashes.
     */
    static String normalizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+27")) return "0" + digits.substring(3);
        if (digits.startsWith("27") && digits.length() == 11) return "0" + digits.substring(2);
        return digits;
    }
}
