package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class ActivateApplicantResponse {

    private UUID applicantId;
    private UUID applicationId;
    private UUID businessProfileId;
    private String firstName;
    private String lastName;
    private String phone;

    // Plain-text password — returned once only, never stored
    private String generatedPassword;
}
