package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

@Getter @Builder
public class SurveyQuestionResponse {
    private UUID id;
    private UUID templateId;
    private int orderIndex;
    private String questionText;
    private String fieldKey;
    private String questionType;
    private List<String> options;
    private boolean required;
    private String helpText;
    private boolean active;
}
