package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Builder
public class NotificationResponse {
    private UUID id;
    private String type;
    private String title;
    private String body;
    private String linkPath;
    private boolean read;
    private OffsetDateTime createdAt;
}
