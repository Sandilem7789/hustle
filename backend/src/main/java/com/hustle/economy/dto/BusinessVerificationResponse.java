package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class BusinessVerificationResponse {

    private UUID id;
    private UUID applicantId;
    private LocalDate visitDate;
    private Double latitude;
    private Double longitude;
    private List<String> photoUrls;
    private String notes;
    private String outcome;
    private String verifiedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
