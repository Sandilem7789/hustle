package com.hustle.economy.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private String id;
    private String customerId;
    private String customerName;
    private String hustlerName;
    private String businessProfileId;
    private String transactionType;
    private String fulfillmentType;
    private String status;
    private String deliveryAddress;
    private Double deliveryLat;
    private Double deliveryLng;
    private List<OrderItemResponse> items;
    private BigDecimal totalAmount;
    private String createdAt;
}
