package com.hustle.economy.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class SaleRequest {
    @NotNull
    private UUID id;
    @NotEmpty
    private List<@Valid SaleItemRequest> items;
    @NotNull
    @PositiveOrZero
    private BigDecimal totalAmount;
}
