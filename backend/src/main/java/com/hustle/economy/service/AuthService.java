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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final HustlerApplicationRepository applicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final HustlerSessionRepository sessionRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse login(AuthRequest request) {
        HustlerApplication application = applicationRepository.findFirstByPhoneOrderBySubmittedAtDesc(request.getPhone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No account found for this phone number"));

        if (application.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), application.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect password");
        }

        if (application.getStatus() == ApplicationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your application is pending facilitator approval");
        }
        if (application.getStatus() == ApplicationStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your application was not approved");
        }

        BusinessProfile profile = businessProfileRepository.findByApplication_Id(application.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Business profile not found"));

        String token = UUID.randomUUID().toString().replace("-", "");
        sessionRepository.save(HustlerSession.builder()
                .token(token)
                .businessProfile(profile)
                .createdAt(OffsetDateTime.now())
                .build());

        return AuthResponse.builder()
                .token(token)
                .businessProfileId(profile.getId().toString())
                .businessName(profile.getBusinessName())
                .firstName(application.getFirstName())
                .lastName(application.getLastName())
                .build();
    }

    @Transactional(readOnly = true)
    public BusinessProfile requireAuth(String token) {
        HustlerSession session = sessionRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired session. Please log in again."));
        return session.getBusinessProfile();
    }
}
