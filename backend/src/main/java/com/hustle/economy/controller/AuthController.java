package com.hustle.economy.controller;

import com.hustle.economy.dto.AuthRequest;
import com.hustle.economy.dto.UnifiedAuthResponse;
import com.hustle.economy.dto.UnifiedRegisterRequest;
import com.hustle.economy.service.UnifiedAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UnifiedAuthService unifiedAuthService;

    @PostMapping("/register")
    public ResponseEntity<UnifiedAuthResponse> register(@RequestBody @Valid UnifiedRegisterRequest request) {
        return ResponseEntity.ok(unifiedAuthService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<UnifiedAuthResponse> login(@RequestBody @Valid AuthRequest request) {
        return ResponseEntity.ok(unifiedAuthService.login(request));
    }
}
