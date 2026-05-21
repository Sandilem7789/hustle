package com.hustle.economy.service;

import com.hustle.economy.dto.AuthRequest;
import com.hustle.economy.dto.AuthResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final HustlerApplicationRepository applicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final HustlerSessionRepository sessionRepository;
    private final AppUserSessionRepository appUserSessionRepository;
    private final AppUserRepository appUserRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public BusinessProfile requireAuth(String token) {
        // Check new unified sessions first
        var appSession = appUserSessionRepository.findByToken(token);
        if (appSession.isPresent()) {
            String phone = appSession.get().getUser().getPhone();
            // Only look for APPROVED applications — a pending test application must not block the coordinator
            HustlerApplication application = applicationRepository
                    .findFirstByPhoneAndStatusOrderBySubmittedAtDesc(phone, ApplicationStatus.APPROVED)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a hustler account"));
            return businessProfileRepository.findByApplication_Id(application.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Business profile not found"));
        }
        // Fall back to legacy hustler sessions
        HustlerSession session = sessionRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid or expired session. Please log in again."));
        return session.getBusinessProfile();
    }

    @Transactional(readOnly = true)
    public BusinessProfile requireRole(String token, UserRole... allowedRoles) {
        BusinessProfile profile = requireAuth(token);

        // Determine role from AppUser if present, else from HustlerApplication
        UserRole role;
        var appSession = appUserSessionRepository.findByToken(token);
        if (appSession.isPresent()) {
            AppUser user = appSession.get().getUser();
            role = user.getRoles().stream()
                    .map(r -> switch (r) {
                        case FACILITATOR -> UserRole.FACILITATOR;
                        case COORDINATOR -> UserRole.COORDINATOR;
                        default -> UserRole.HUSTLER;
                    })
                    .filter(r -> r != UserRole.HUSTLER || user.getRoles().contains(AppUserRole.HUSTLER))
                    .findFirst()
                    .orElse(UserRole.HUSTLER);
        } else {
            role = profile.getApplication().getRole() != null
                    ? profile.getApplication().getRole()
                    : UserRole.HUSTLER;
        }

        if (!Arrays.asList(allowedRoles).contains(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return profile;
    }
}
