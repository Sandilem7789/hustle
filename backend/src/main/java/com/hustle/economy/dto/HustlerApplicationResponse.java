package com.hustle.economy.dto;

import com.hustle.economy.entity.ApplicationStatus;
import lombok.Builder;
import lombok.Value;

import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class HustlerApplicationResponse {
    UUID id;
    String firstName;
    String lastName;
    String email;
    String phone;
    CommunityResponse community;
    String businessName;
    String businessType;
    String description;
    String vision;
    String mission;
    String targetCustomers;
    String operatingArea;
    Double latitude;
    Double longitude;
    ApplicationStatus status;
    String facilitatorNotes;
    OffsetDateTime submittedAt;
    OffsetDateTime decidedAt;
}
