package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter @Builder
public class SurveyAssignmentDetailResponse {
    private UUID id;
    private UUID templateId;
    private String templateName;
    private String templateType;
    private String status;
    private LocalDate dueDate;
    private List<SurveyQuestionResponse> questions;
    // questionId (as string) -> answerText, for pre-filling a form already in progress
    private Map<String, String> answers;
}
