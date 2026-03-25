package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommunityRequest {
    @NotBlank
    private String name;
    private String region;
    private String description;
    private Double latitude;
    private Double longitude;
}
