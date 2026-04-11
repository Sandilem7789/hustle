package com.hustle.economy.dto;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DistanceCheckResponse {
    private double distanceKm;
    private boolean withinLimit;
    private String message;
}
