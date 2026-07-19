package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Builder
public class SurveyTemplateResponse {
    private UUID id;
    private String type;
    private String name;
    private String description;
    private boolean active;
    private OffsetDateTime createdAt;
}
