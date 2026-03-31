package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Value;

import java.util.UUID;

@Value
@Builder
public class CommunityResponse {
    UUID id;
    String name;
    String region;
    String description;
    Double latitude;
    Double longitude;
}
