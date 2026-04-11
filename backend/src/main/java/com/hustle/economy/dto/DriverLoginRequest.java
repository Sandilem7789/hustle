package com.hustle.economy.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverLoginRequest {
    private String phone;
    private String password;
}
