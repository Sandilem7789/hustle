package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter @Builder
public class IncomeSummaryResponse {
    private BigDecimal todayIncome;
    private BigDecimal todayExpenses;
    private BigDecimal todayProfit;
    private BigDecimal weekIncome;
    private BigDecimal weekExpenses;
    private BigDecimal weekProfit;
    private BigDecimal monthIncome;
    private BigDecimal monthExpenses;
    private BigDecimal monthProfit;
}
