package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ApplicantRequest {

    @NotNull
    private String communityId;

    // Cohort number within the community, defaults to 1
    private Integer cohortNumber;

    @NotBlank
    private String firstName;

    @NotBlank
    private String lastName;

    private String gender;

    private Integer age;

    @NotBlank
    private String phone;

    private String email;

    @NotBlank
    private String typeOfHustle;

    private String districtSection;

    private String capturedBy;
}
