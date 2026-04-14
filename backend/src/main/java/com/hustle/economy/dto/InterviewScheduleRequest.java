package com.hustle.economy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class InterviewScheduleRequest {

    @NotNull
    private LocalDate scheduledDate;
}
