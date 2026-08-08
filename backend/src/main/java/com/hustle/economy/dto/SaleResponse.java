package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class SaleResponse {
    private UUID id;
    private BigDecimal totalAmount;
    private OffsetDateTime saleDate;
    private OffsetDateTime createdAt;
    private List<SaleItemResponse> items;
}
