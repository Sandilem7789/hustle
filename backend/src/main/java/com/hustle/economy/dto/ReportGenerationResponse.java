package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ReportGenerationResponse {
    private String reportText;
}
