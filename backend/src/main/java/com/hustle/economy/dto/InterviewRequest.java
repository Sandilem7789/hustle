package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class InterviewRequest {

    @NotNull
    private LocalDate conductedDate;

    @NotNull
    private Boolean canDescribeBusiness;

    @NotNull
    private Boolean appearsGenuine;

    @NotNull
    private Boolean hasRunningBusiness;

    private String notes;

    @NotBlank
    private String outcome; // PASS, FAIL, NO_SHOW

    private String conductedBy;
}
