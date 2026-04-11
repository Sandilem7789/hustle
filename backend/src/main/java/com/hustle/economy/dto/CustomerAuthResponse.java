package com.hustle.economy.dto;

import lombok.*;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAuthResponse {
    private String token;
    private String customerId;
    private String firstName;
    private String lastName;
    private String phone;
}
