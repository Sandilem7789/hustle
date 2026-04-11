package com.hustle.economy.controller;

import com.hustle.economy.dto.DistanceCheckRequest;
import com.hustle.economy.dto.DistanceCheckResponse;
import com.hustle.economy.dto.OrderRequest;
import com.hustle.economy.dto.OrderResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Customer;
import com.hustle.economy.entity.OrderStatus;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.CustomerAuthService;
import com.hustle.economy.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final CustomerAuthService customerAuthService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestHeader("X-Customer-Token") String token,
            @RequestBody @Valid OrderRequest req) {
        Customer customer = customerAuthService.requireAuth(token);
        return ResponseEntity.ok(orderService.createOrder(req, customer.getId()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<OrderResponse>> myOrders(
            @RequestHeader("X-Customer-Token") String token) {
        Customer customer = customerAuthService.requireAuth(token);
        return ResponseEntity.ok(orderService.listOrdersByCustomer(customer.getId()));
    }

    @GetMapping("/incoming")
    public ResponseEntity<List<OrderResponse>> incomingOrders(
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(orderService.listOrdersByHustler(profile.getId()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @RequestHeader("X-Auth-Token") String token,
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        BusinessProfile profile = authService.requireAuth(token);
        OrderStatus newStatus = OrderStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(orderService.updateOrderStatus(id, newStatus, profile.getId()));
    }

    @PostMapping("/validate-distance")
    public ResponseEntity<DistanceCheckResponse> validateDistance(
            @RequestBody DistanceCheckRequest req) {
        return ResponseEntity.ok(orderService.validateDistance(req));
    }
}
