package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HustlerDecisionRequest {
    @NotBlank
    private String status;
    private String facilitatorNotes;
}
