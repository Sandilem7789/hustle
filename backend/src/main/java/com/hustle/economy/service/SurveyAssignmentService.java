package com.hustle.economy.service;

import com.hustle.economy.dto.*;
import com.hustle.economy.entity.*;
import com.hustle.economy.mapper.SurveyMapper;
import com.hustle.economy.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SurveyAssignmentService {

    private final SurveyAssignmentRepository assignmentRepository;
    private final SurveyTemplateRepository templateRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final SurveyQuestionRepository questionRepository;
    private final SurveyAnswerRepository answerRepository;
    private final NotificationService notificationService;
    private final SurveyMapper mapper;

    @Transactional
    public List<SurveyAssignmentResponse> assign(SurveyAssignRequest request, UUID assignedByUserId) {
        SurveyTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new EntityNotFoundException("Survey template not found"));

        List<BusinessProfile> targets;
        if (request.getBusinessProfileIds() != null && !request.getBusinessProfileIds().isEmpty()) {
            targets = businessProfileRepository.findAllById(request.getBusinessProfileIds());
        } else if (request.getCommunityId() != null) {
            targets = businessProfileRepository.findByCommunity_IdAndStatus(request.getCommunityId(), ApplicationStatus.APPROVED);
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide businessProfileIds or communityId");
        }

        if (targets.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No matching hustlers to assign to");
        }

        List<SurveyAssignment> created = targets.stream().map(bp -> {
            SurveyAssignment assignment = SurveyAssignment.builder()
                    .template(template)
                    .businessProfile(bp)
                    .assignedByUserId(assignedByUserId)
                    .assignedAt(OffsetDateTime.now())
                    .dueDate(request.getDueDate())
                    .status(SurveyAssignmentStatus.ASSIGNED)
                    .build();
            return assignmentRepository.save(assignment);
        }).toList();

        created.forEach(assignment -> notificationService.create(
                assignment.getBusinessProfile(),
                NotificationType.SURVEY_ASSIGNED,
                "New survey: " + template.getName(),
                "You've been assigned the \"" + template.getName() + "\" survey. Tap to fill it in.",
                "/surveys/" + assignment.getId()));

        return created.stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SurveyAssignmentResponse> search(SurveyAssignmentStatus status, SurveyType templateType, UUID communityId) {
        return assignmentRepository.search(status, templateType, communityId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SurveyAssignmentResponse> listForBusinessProfile(UUID businessProfileId) {
        return assignmentRepository.findByBusinessProfile_IdOrderByAssignedAtDesc(businessProfileId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SurveyAssignmentDetailResponse getDetail(UUID assignmentId, UUID requesterBusinessProfileId) {
        SurveyAssignment assignment = loadOwned(assignmentId, requesterBusinessProfileId);

        List<SurveyQuestionResponse> questions = questionRepository
                .findByTemplate_IdAndActiveTrueOrderByOrderIndexAsc(assignment.getTemplate().getId())
                .stream().map(mapper::toResponse).toList();

        Map<String, String> answers = new LinkedHashMap<>();
        answerRepository.findByAssignment_Id(assignmentId)
                .forEach(a -> answers.put(a.getQuestion().getId().toString(), a.getAnswerText()));

        return SurveyAssignmentDetailResponse.builder()
                .id(assignment.getId())
                .templateId(assignment.getTemplate().getId())
                .templateName(assignment.getTemplate().getName())
                .templateType(assignment.getTemplate().getType().name())
                .status(assignment.getStatus().name())
                .dueDate(assignment.getDueDate())
                .questions(questions)
                .answers(answers)
                .build();
    }

    @Transactional
    public SurveyAssignmentResponse saveAnswers(UUID assignmentId, UUID requesterBusinessProfileId, SurveyAnswerSubmitRequest request) {
        SurveyAssignment assignment = loadOwned(assignmentId, requesterBusinessProfileId);

        request.getAnswers().forEach((questionId, answerText) -> {
            SurveyQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new EntityNotFoundException("Survey question not found"));

            SurveyAnswer answer = answerRepository.findByAssignment_IdAndQuestion_Id(assignmentId, questionId)
                    .orElseGet(() -> SurveyAnswer.builder()
                            .assignment(assignment)
                            .question(question)
                            .build());
            answer.setAnswerText(answerText);
            answer.setAnsweredAt(OffsetDateTime.now());
            answerRepository.save(answer);
        });

        assignment.setStatus(request.isSubmit() ? SurveyAssignmentStatus.SUBMITTED : SurveyAssignmentStatus.IN_PROGRESS);
        return mapper.toResponse(assignmentRepository.save(assignment));
    }

    @Transactional(readOnly = true)
    public Map<String, String> getFlatAnswers(UUID assignmentId) {
        if (!assignmentRepository.existsById(assignmentId)) {
            throw new EntityNotFoundException("Survey assignment not found");
        }

        Map<String, String> flat = new LinkedHashMap<>();
        answerRepository.findByAssignment_Id(assignmentId)
                .forEach(a -> flat.put(a.getQuestion().getFieldKey(), a.getAnswerText()));
        return flat;
    }

    private SurveyAssignment loadOwned(UUID assignmentId, UUID requesterBusinessProfileId) {
        SurveyAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new EntityNotFoundException("Survey assignment not found"));
        if (requesterBusinessProfileId != null
                && !assignment.getBusinessProfile().getId().equals(requesterBusinessProfileId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return assignment;
    }
}
