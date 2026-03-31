package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class ProductResponse {
    private UUID id;
    private String name;
    private String description;
    private BigDecimal price;
    private String mediaUrl;
    private String businessId;
    private String businessName;
    private OffsetDateTime createdAt;
}
