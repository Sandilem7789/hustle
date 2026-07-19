package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SurveyTemplateRequest {
    @NotNull
    private String type; // BASELINE, GROWTH_PLAN, PROFILE
    @NotBlank
    private String name;
    private String description;
    private Boolean active;
}
