package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerLoginRequest {
    @NotBlank
    private String phone;

    @NotBlank
    private String password;
}
