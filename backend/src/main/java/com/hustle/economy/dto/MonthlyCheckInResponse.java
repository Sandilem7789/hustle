package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class MonthlyCheckInResponse {
    private UUID id;
    private UUID businessProfileId;
    private String visitMonth;
    private List<String> photoUrls;
    private String notes;
    private String visitedBy;
    private OffsetDateTime createdAt;
}
