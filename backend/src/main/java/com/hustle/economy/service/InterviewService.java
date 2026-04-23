package com.hustle.economy.service;

import com.hustle.economy.dto.InterviewRequest;
import com.hustle.economy.dto.InterviewResponse;
import com.hustle.economy.dto.InterviewScheduleRequest;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.InterviewRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewRepository interviewRepository;
    private final ApplicantRepository applicantRepository;

    @Transactional(readOnly = true)
    public InterviewResponse getByApplicant(UUID applicantId) {
        return interviewRepository.findByApplicantId(applicantId)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("No interview record found for this applicant"));
    }

    @Transactional
    public InterviewResponse scheduleInterview(UUID applicantId, InterviewScheduleRequest request) {
        Applicant applicant = applicantRepository.findByIdFetched(applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        Interview interview = interviewRepository.findByApplicantId(applicantId)
                .orElseGet(() -> Interview.builder()
                        .applicant(applicant)
                        .createdAt(OffsetDateTime.now())
                        .build());

        interview.setScheduledDate(request.getScheduledDate());
        interview.setUpdatedAt(OffsetDateTime.now());

        // Advance stage to INTERVIEW_SCHEDULED if still at CALLING or CAPTURED
        if (applicant.getPipelineStage() == PipelineStage.CALLING
                || applicant.getPipelineStage() == PipelineStage.CAPTURED) {
            applicant.setPipelineStage(PipelineStage.INTERVIEW_SCHEDULED);
            applicant.setUpdatedAt(OffsetDateTime.now());
            applicantRepository.save(applicant);
        }

        return toResponse(interviewRepository.save(interview));
    }

    @Transactional
    public InterviewResponse recordOutcome(UUID applicantId, InterviewRequest request) {
        Applicant applicant = applicantRepository.findByIdFetched(applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        InterviewOutcome outcome = InterviewOutcome.valueOf(request.getOutcome().toUpperCase());

        Interview interview = interviewRepository.findByApplicantId(applicantId)
                .orElseGet(() -> Interview.builder()
                        .applicant(applicant)
                        .createdAt(OffsetDateTime.now())
                        .build());

        interview.setConductedDate(request.getConductedDate());
        if (outcome == InterviewOutcome.PASS) {
            interview.setCanDescribeBusiness(true);
            interview.setAppearsGenuine(true);
            interview.setHasRunningBusiness(true);
        } else {
            interview.setCanDescribeBusiness(request.getCanDescribeBusiness());
            interview.setAppearsGenuine(request.getAppearsGenuine());
            interview.setHasRunningBusiness(request.getHasRunningBusiness());
        }
        interview.setNotes(request.getNotes());
        interview.setOutcome(outcome);
        interview.setConductedBy(request.getConductedBy());
        interview.setUpdatedAt(OffsetDateTime.now());

        // Move applicant to INTERVIEWED regardless of outcome
        applicant.setPipelineStage(PipelineStage.INTERVIEWED);
        applicant.setUpdatedAt(OffsetDateTime.now());
        applicantRepository.save(applicant);

        return toResponse(interviewRepository.save(interview));
    }

    private InterviewResponse toResponse(Interview i) {
        return InterviewResponse.builder()
                .id(i.getId())
                .applicantId(i.getApplicant().getId())
                .scheduledDate(i.getScheduledDate())
                .conductedDate(i.getConductedDate())
                .canDescribeBusiness(i.getCanDescribeBusiness())
                .appearsGenuine(i.getAppearsGenuine())
                .hasRunningBusiness(i.getHasRunningBusiness())
                .notes(i.getNotes())
                .outcome(i.getOutcome() != null ? i.getOutcome().name() : null)
                .conductedBy(i.getConductedBy())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }
}
