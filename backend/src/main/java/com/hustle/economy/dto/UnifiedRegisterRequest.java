package com.hustle.economy.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UnifiedRegisterRequest {
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotBlank private String phone;
    private String email;
    @NotBlank private String password;
}
