package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class BusinessVerificationRequest {

    @NotNull
    private LocalDate visitDate;

    private Double latitude;
    private Double longitude;

    private List<String> photoUrls;

    private String notes;

    @NotBlank
    private String outcome; // VERIFIED, FAILED

    private String verifiedBy;
}
