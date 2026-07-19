package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter @Setter
public class SurveyQuestionRequest {
    @NotBlank
    private String questionText;
    // Only read on create — a stable key already assigned to a question is never changed.
    private String fieldKey;
    @NotBlank
    private String questionType; // TEXT, TEXTAREA, NUMBER, DATE, SINGLE_CHOICE, MULTI_CHOICE
    private List<String> options;
    private boolean required;
    private String helpText;
}
