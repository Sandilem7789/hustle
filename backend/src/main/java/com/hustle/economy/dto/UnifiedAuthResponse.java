package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class UnifiedAuthResponse {
    private String token;
    private String customerToken;
    private String userId;
    private String firstName;
    private String lastName;
    private String phone;
    private List<String> roles;
    // Hustler-specific fields (null for non-hustlers)
    private String businessProfileId;
    private String businessName;
    private String businessType;
    // "PENDING" if the user has a pending hustler application; null otherwise
    private String applicationStatus;
}
