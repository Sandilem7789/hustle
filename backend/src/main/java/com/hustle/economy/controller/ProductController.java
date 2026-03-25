package com.hustle.economy.controller;

import com.hustle.economy.dto.ProductRequest;
import com.hustle.economy.entity.Product;
import com.hustle.economy.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    public ResponseEntity<Product> createProduct(@RequestBody @Valid ProductRequest request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    @GetMapping
    public ResponseEntity<List<Product>> listProducts(@RequestParam(required = false) String communityId) {
        return ResponseEntity.ok(productService.listProducts(communityId));
    }
}
