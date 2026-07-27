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

    // Plain-text password — returned once only, never stored. Null when credentialsMode is EXISTING_ACCOUNT.
    private String generatedPassword;

    // EXISTING_ACCOUNT: applicant already had an AppUser (registered via the app) — no new password issued.
    // GENERATED: a brand-new password was created for this applicant.
    private String credentialsMode;
}
