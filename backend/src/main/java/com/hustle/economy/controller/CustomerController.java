package com.hustle.economy.controller;

import com.hustle.economy.dto.CustomerAuthResponse;
import com.hustle.economy.dto.CustomerLoginRequest;
import com.hustle.economy.dto.CustomerRegisterRequest;
import com.hustle.economy.entity.Customer;
import com.hustle.economy.service.CustomerAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerAuthService customerAuthService;

    @PostMapping("/register")
    public ResponseEntity<CustomerAuthResponse> register(@RequestBody @Valid CustomerRegisterRequest req) {
        return ResponseEntity.ok(customerAuthService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<CustomerAuthResponse> login(@RequestBody @Valid CustomerLoginRequest req) {
        return ResponseEntity.ok(customerAuthService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<CustomerAuthResponse> me(@RequestHeader("X-Customer-Token") String token) {
        Customer customer = customerAuthService.requireAuth(token);
        CustomerAuthResponse response = CustomerAuthResponse.builder()
                .customerId(customer.getId().toString())
                .firstName(customer.getFirstName())
                .lastName(customer.getLastName())
                .phone(customer.getPhone())
                .build();
        return ResponseEntity.ok(response);
    }
}
