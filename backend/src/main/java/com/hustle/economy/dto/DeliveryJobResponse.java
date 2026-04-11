package com.hustle.economy.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryJobResponse {
    private String jobId;
    private String orderId;
    private String driverId;
    private String status;
    private String sellerName;
    private String sellerAddress;
    private Double sellerLat;
    private Double sellerLng;
    private String customerName;
    private String customerPhone;
    private String deliveryAddress;
    private Double deliveryLat;
    private Double deliveryLng;
    private List<OrderItemResponse> items;
    private BigDecimal totalAmount;
    private BigDecimal payoutAmount;
    private String createdAt;
    private String acceptedAt;
}
