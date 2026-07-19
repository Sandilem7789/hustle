package com.hustle.economy.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hustle.economy.dto.*;
import com.hustle.economy.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SurveyMapper {

    private final ObjectMapper objectMapper;

    public SurveyTemplateResponse toResponse(SurveyTemplate template) {
        if (template == null) {
            return null;
        }
        return SurveyTemplateResponse.builder()
                .id(template.getId())
                .type(template.getType().name())
                .name(template.getName())
                .description(template.getDescription())
                .active(template.isActive())
                .createdAt(template.getCreatedAt())
                .build();
    }

    public SurveyQuestionResponse toResponse(SurveyQuestion question) {
        if (question == null) {
            return null;
        }
        return SurveyQuestionResponse.builder()
                .id(question.getId())
                .templateId(question.getTemplate().getId())
                .orderIndex(question.getOrderIndex())
                .questionText(question.getQuestionText())
                .fieldKey(question.getFieldKey())
                .questionType(question.getQuestionType().name())
                .options(parseOptions(question.getOptions()))
                .required(question.isRequired())
                .helpText(question.getHelpText())
                .active(question.isActive())
                .build();
    }

    public SurveyAssignmentResponse toResponse(SurveyAssignment assignment) {
        if (assignment == null) {
            return null;
        }
        BusinessProfile bp = assignment.getBusinessProfile();
        return SurveyAssignmentResponse.builder()
                .id(assignment.getId())
                .templateId(assignment.getTemplate().getId())
                .templateName(assignment.getTemplate().getName())
                .templateType(assignment.getTemplate().getType().name())
                .businessProfileId(bp.getId())
                .businessName(bp.getBusinessName())
                .communityName(bp.getCommunity() != null ? bp.getCommunity().getName() : null)
                .assignedByUserId(assignment.getAssignedByUserId())
                .assignedAt(assignment.getAssignedAt())
                .dueDate(assignment.getDueDate())
                .status(assignment.getStatus().name())
                .build();
    }

    public NotificationResponse toResponse(Notification notification) {
        if (notification == null) {
            return null;
        }
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType().name())
                .title(notification.getTitle())
                .body(notification.getBody())
                .linkPath(notification.getLinkPath())
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }

    public String writeOptions(List<String> options) {
        if (options == null || options.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(options);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid options list", e);
        }
    }

    private List<String> parseOptions(String optionsJson) {
        if (optionsJson == null || optionsJson.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(optionsJson, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
