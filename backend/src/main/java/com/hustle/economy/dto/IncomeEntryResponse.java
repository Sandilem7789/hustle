package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter @Builder
public class IncomeEntryResponse {
    private UUID id;
    private LocalDate date;
    private BigDecimal amount;
    private String channel;
    private String entryType;
    private String notes;
    private String category;
    private OffsetDateTime createdAt;
}
