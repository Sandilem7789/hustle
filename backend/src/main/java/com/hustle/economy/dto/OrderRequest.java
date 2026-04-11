package com.hustle.economy.dto;

import com.hustle.economy.entity.FulfillmentType;
import com.hustle.economy.entity.TransactionType;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {
    @NotEmpty
    private List<OrderItemRequest> items;

    private TransactionType transactionType;
    private FulfillmentType fulfillmentType;
    private String deliveryAddress;
    private Double deliveryLat;
    private Double deliveryLng;
    private String businessPurchaseOrderRef;
}
