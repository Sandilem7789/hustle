package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {
    private String token;
    private String businessProfileId;
    private String businessName;
    private String firstName;
    private String lastName;
}
