package com.hustle.economy.service;

import com.hustle.economy.dto.BusinessVerificationRequest;
import com.hustle.economy.dto.BusinessVerificationResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessVerificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessVerificationService {

    private final BusinessVerificationRepository verificationRepository;
    private final ApplicantRepository applicantRepository;

    @Transactional(readOnly = true)
    public BusinessVerificationResponse getByApplicant(UUID applicantId) {
        return verificationRepository.findByApplicantId(applicantId)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("No verification record found for this applicant"));
    }

    @Transactional
    public BusinessVerificationResponse recordVerification(UUID applicantId, BusinessVerificationRequest request) {
        Applicant applicant = applicantRepository.findByIdFetched(applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        VerificationOutcome outcome = VerificationOutcome.valueOf(request.getOutcome().toUpperCase());

        BusinessVerification verification = verificationRepository.findByApplicantId(applicantId)
                .orElseGet(() -> BusinessVerification.builder()
                        .applicant(applicant)
                        .createdAt(OffsetDateTime.now())
                        .build());

        verification.setVisitDate(request.getVisitDate());
        verification.setLatitude(request.getLatitude());
        verification.setLongitude(request.getLongitude());
        verification.setPhotoUrls(request.getPhotoUrls());
        verification.setNotes(request.getNotes());
        verification.setOutcome(outcome);
        verification.setVerifiedBy(request.getVerifiedBy());
        verification.setUpdatedAt(OffsetDateTime.now());

        // Move applicant stage forward after verification is recorded
        applicant.setPipelineStage(PipelineStage.BUSINESS_VERIFICATION);
        applicant.setUpdatedAt(OffsetDateTime.now());
        applicantRepository.save(applicant);

        return toResponse(verificationRepository.save(verification));
    }

    private BusinessVerificationResponse toResponse(BusinessVerification v) {
        return BusinessVerificationResponse.builder()
                .id(v.getId())
                .applicantId(v.getApplicant().getId())
                .visitDate(v.getVisitDate())
                .latitude(v.getLatitude())
                .longitude(v.getLongitude())
                .photoUrls(v.getPhotoUrls())
                .notes(v.getNotes())
                .outcome(v.getOutcome() != null ? v.getOutcome().name() : null)
                .verifiedBy(v.getVerifiedBy())
                .createdAt(v.getCreatedAt())
                .updatedAt(v.getUpdatedAt())
                .build();
    }
}
