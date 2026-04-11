package com.hustle.economy.dto;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DriverAuthResponse {
    private String token;
    private String driverId;
    private String firstName;
    private String lastName;
    private String vehicleType;
    private String communityName;
}
