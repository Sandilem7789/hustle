package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Builder
public class SurveyAssignmentResponse {
    private UUID id;
    private UUID templateId;
    private String templateName;
    private String templateType;
    private UUID businessProfileId;
    private String businessName;
    private String communityName;
    private UUID assignedByUserId;
    private OffsetDateTime assignedAt;
    private LocalDate dueDate;
    private String status;
}
