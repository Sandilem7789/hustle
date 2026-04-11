package com.hustle.economy.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DistanceCheckRequest {
    private UUID sellerId;
    private Double deliveryLat;
    private Double deliveryLng;
}
