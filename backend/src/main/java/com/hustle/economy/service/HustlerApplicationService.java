package com.hustle.economy.service;

import com.hustle.economy.dto.HustlerApplicationRequest;
import com.hustle.economy.dto.HustlerDecisionRequest;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.HustlerApplication;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HustlerApplicationService {

    private final HustlerApplicationRepository applicationRepository;
    private final CommunityRepository communityRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder =
            new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();

    @Transactional
    public HustlerApplication createApplication(HustlerApplicationRequest request) {
        Community community = resolveCommunity(request.getCommunityId(), request.getCommunityName());

        HustlerApplication application = HustlerApplication.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .community(community)
                .businessName(request.getBusinessName())
                .businessType(request.getBusinessType())
                .description(request.getDescription())
                .vision(request.getVision())
                .mission(request.getMission())
                .targetCustomers(request.getTargetCustomers())
                .operatingArea(request.getOperatingArea())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .status(ApplicationStatus.PENDING)
                .submittedAt(OffsetDateTime.now())
                .build();
        return applicationRepository.save(application);
    }

    @Transactional(readOnly = true)
    public List<HustlerApplication> listApplications(String statusValue, String communityId) {
        ApplicationStatus status = parseStatus(statusValue);
        if (communityId != null && !communityId.isBlank()) {
            return applicationRepository.findByStatusAndCommunity_IdOrderBySubmittedAtDesc(status, UUID.fromString(communityId));
        }
        return applicationRepository.findByStatusOrderBySubmittedAtDesc(status);
    }

    @Transactional
    public HustlerApplication decide(UUID applicationId, HustlerDecisionRequest request) {
        HustlerApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("Application not found"));

        ApplicationStatus nextStatus = parseStatus(request.getStatus());
        application.setStatus(nextStatus);
        application.setFacilitatorNotes(request.getFacilitatorNotes());
        application.setDecidedAt(OffsetDateTime.now());

        if (nextStatus == ApplicationStatus.APPROVED) {
            upsertBusinessProfile(application);
        }

        return application;
    }

    private void upsertBusinessProfile(HustlerApplication application) {
        businessProfileRepository.findByApplication_Id(application.getId())
                .orElseGet(() -> businessProfileRepository.save(BusinessProfile.builder()
                        .application(application)
                        .community(application.getCommunity())
                        .businessName(application.getBusinessName())
                        .businessType(application.getBusinessType())
                        .description(application.getDescription())
                        .vision(application.getVision())
                        .mission(application.getMission())
                        .targetCustomers(application.getTargetCustomers())
                        .operatingArea(application.getOperatingArea())
                        .latitude(application.getLatitude())
                        .longitude(application.getLongitude())
                        .status(ApplicationStatus.APPROVED)
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build()));
    }

    private ApplicationStatus parseStatus(String statusValue) {
        if (statusValue == null) {
            return ApplicationStatus.PENDING;
        }
        try {
            return ApplicationStatus.valueOf(statusValue.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ApplicationStatus.PENDING;
        }
    }

    private Community resolveCommunity(String communityId, String communityName) {
        if (communityId != null && !communityId.isBlank()) {
            return communityRepository.findById(UUID.fromString(communityId))
                    .orElseThrow(() -> new EntityNotFoundException("Community not found"));
        }
        if (communityName != null && !communityName.isBlank()) {
            return communityRepository.findByNameIgnoreCase(communityName)
                    .orElseGet(() -> communityRepository.save(Community.builder().name(communityName).build()));
        }
        return null;
    }
}
