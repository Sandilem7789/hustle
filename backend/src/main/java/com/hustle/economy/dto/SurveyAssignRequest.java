package com.hustle.economy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter @Setter
public class SurveyAssignRequest {
    @NotNull
    private UUID templateId;
    // Provide either businessProfileIds (specific hustlers) or communityId (bulk by community) — at least one is required.
    private List<UUID> businessProfileIds;
    private UUID communityId;
    private LocalDate dueDate;
}
