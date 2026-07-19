package com.hustle.economy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter @Setter
public class SurveyAnswerSubmitRequest {
    @NotNull
    private Map<UUID, String> answers; // questionId -> answerText
    // false = save progress only (status -> IN_PROGRESS), true = final submit (status -> SUBMITTED)
    private boolean submit;
}
