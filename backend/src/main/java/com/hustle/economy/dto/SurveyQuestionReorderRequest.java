package com.hustle.economy.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter @Setter
public class SurveyQuestionReorderRequest {
    @NotEmpty
    private List<UUID> orderedQuestionIds;
}
