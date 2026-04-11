package com.hustle.economy.service;

import com.hustle.economy.dto.CustomerAuthResponse;
import com.hustle.economy.dto.CustomerLoginRequest;
import com.hustle.economy.dto.CustomerRegisterRequest;
import com.hustle.economy.entity.Customer;
import com.hustle.economy.entity.CustomerSession;
import com.hustle.economy.repository.CustomerRepository;
import com.hustle.economy.repository.CustomerSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final CustomerSessionRepository customerSessionRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public CustomerAuthResponse register(CustomerRegisterRequest req) {
        if (customerRepository.findByPhone(req.getPhone()).isPresent()) {
            throw new RuntimeException("Phone already registered");
        }

        Customer customer = Customer.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .phone(req.getPhone())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .createdAt(OffsetDateTime.now())
                .build();

        customer = customerRepository.save(customer);

        String token = UUID.randomUUID().toString().replace("-", "");
        customerSessionRepository.save(CustomerSession.builder()
                .token(token)
                .customer(customer)
                .createdAt(OffsetDateTime.now())
                .build());

        return toResponse(token, customer);
    }

    @Transactional
    public CustomerAuthResponse login(CustomerLoginRequest req) {
        Customer customer = customerRepository.findByPhone(req.getPhone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), customer.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        customerSessionRepository.save(CustomerSession.builder()
                .token(token)
                .customer(customer)
                .createdAt(OffsetDateTime.now())
                .build());

        return toResponse(token, customer);
    }

    @Transactional(readOnly = true)
    public Customer requireAuth(String token) {
        CustomerSession session = customerSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return session.getCustomer();
    }

    private CustomerAuthResponse toResponse(String token, Customer customer) {
        return CustomerAuthResponse.builder()
                .token(token)
                .customerId(customer.getId().toString())
                .firstName(customer.getFirstName())
                .lastName(customer.getLastName())
                .phone(customer.getPhone())
                .build();
    }
}
