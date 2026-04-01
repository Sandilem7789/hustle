package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
public class FacilitatorHustlerResponse {
    private UUID businessProfileId;
    private String firstName;
    private String lastName;
    private String businessName;
    private String businessType;
    private String communityName;
    private String operatingArea;
    private String description;
    private String targetCustomers;
    private String vision;
    private String mission;
    private BigDecimal monthIncome;
    private BigDecimal monthExpenses;
    private BigDecimal monthProfit;
    private boolean active;
}
