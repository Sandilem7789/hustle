package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter @Builder
public class IncomeSummaryResponse {
    private BigDecimal today;
    private BigDecimal weekToDate;
    private BigDecimal monthToDate;
    private BigDecimal totalCash;
    private BigDecimal totalMarketplace;
}
