package com.hustle.economy.controller;

import com.hustle.economy.dto.SaleRequest;
import com.hustle.economy.dto.SaleResponse;
import com.hustle.economy.dto.SalesPageResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<SaleResponse> createSale(
            @RequestHeader("X-Auth-Token") String token,
            @RequestBody @Valid SaleRequest request) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(saleService.createSale(request, profile));
    }

    @GetMapping
    public ResponseEntity<SalesPageResponse> listSales(
            @RequestHeader("X-Auth-Token") String token,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(saleService.listSales(profile.getId(), page, size));
    }
}
