package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter
public class IncomeEntryRequest {
    @NotNull
    private LocalDate date;
    @NotNull @PositiveOrZero
    private BigDecimal amount;
    @NotBlank
    private String channel; // CASH or MARKETPLACE
    private String entryType; // INCOME or EXPENSE; defaults to INCOME
    private String notes;
    private String category;
}
