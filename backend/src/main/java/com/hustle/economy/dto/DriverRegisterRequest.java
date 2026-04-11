package com.hustle.economy.dto;

import com.hustle.economy.entity.VehicleType;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverRegisterRequest {
    private String firstName;
    private String lastName;
    private String phone;
    private String idNumber;
    private String password;
    private VehicleType vehicleType;
    private UUID communityId;
}
