package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

@Getter @Builder
public class ReportGenerationResponse {
    private String status;
    private String reportText;
    private String financialImpactJson;
    private String error;
}
