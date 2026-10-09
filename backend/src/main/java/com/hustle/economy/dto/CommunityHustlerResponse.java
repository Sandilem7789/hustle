package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class CommunityHustlerResponse {
    UUID id;
    String businessName;
    String businessType;
    String description;
    String operatingArea;
    CommunityResponse community;
}
