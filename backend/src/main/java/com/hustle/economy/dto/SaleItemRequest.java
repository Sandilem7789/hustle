package com.hustle.economy.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
public class SaleItemRequest {
    private UUID productId;
    private String itemName;
    @NotNull
    @PositiveOrZero
    private BigDecimal unitPrice;
    @NotNull
    @Min(1)
    private Integer quantity;
}
