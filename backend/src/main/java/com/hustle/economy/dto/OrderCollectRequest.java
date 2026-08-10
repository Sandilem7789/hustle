package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderCollectRequest {
    @NotBlank
    private String pickupToken;
}
