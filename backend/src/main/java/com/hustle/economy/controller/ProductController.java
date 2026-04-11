package com.hustle.economy.controller;

import com.hustle.economy.dto.ProductRequest;
import com.hustle.economy.dto.ProductResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @RequestHeader("X-Auth-Token") String token,
            @RequestBody @Valid ProductRequest request) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(productService.createProduct(request, profile.getId()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ProductResponse>> listMyProducts(
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(productService.listMyProducts(profile.getId()));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @RequestHeader("X-Auth-Token") String token,
            @PathVariable UUID id,
            @RequestBody @Valid ProductRequest request) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(productService.updateProduct(id, request, profile.getId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @RequestHeader("X-Auth-Token") String token,
            @PathVariable UUID id) {
        BusinessProfile profile = authService.requireAuth(token);
        productService.deleteProduct(id, profile.getId());
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> listProducts(
            @RequestParam(required = false) String communityId,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(productService.listProducts(communityId, category));
    }
}
