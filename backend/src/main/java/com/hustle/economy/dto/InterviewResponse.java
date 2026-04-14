package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class InterviewResponse {

    private UUID id;
    private UUID applicantId;
    private LocalDate scheduledDate;
    private LocalDate conductedDate;
    private Boolean canDescribeBusiness;
    private Boolean appearsGenuine;
    private Boolean hasRunningBusiness;
    private String notes;
    private String outcome;
    private String conductedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
