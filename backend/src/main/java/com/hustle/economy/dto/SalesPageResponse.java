package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SalesPageResponse {
    private List<SaleResponse> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
