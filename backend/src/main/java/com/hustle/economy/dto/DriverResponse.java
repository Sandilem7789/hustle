package com.hustle.economy.dto;

import lombok.*;

import java.time.OffsetDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverResponse {
    private String driverId;
    private String firstName;
    private String lastName;
    private String phone;
    private String vehicleType;
    private String communityName;
    private String status;
    private OffsetDateTime createdAt;
}
