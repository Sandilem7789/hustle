package com.hustle.economy.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class HustlerApplicationRequest {
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    @Email
    private String email;
    private String phone;
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    private String communityId;
    private String communityName;
    @NotBlank
    private String businessName;
    @NotBlank
    private String businessType;
    @NotBlank
    @Size(min = 10)
    private String description;
    @NotBlank
    private String vision;
    @NotBlank
    private String mission;
    @NotBlank
    private String targetCustomers;
    @NotBlank
    private String operatingArea;
    private Double latitude;
    private Double longitude;
}
