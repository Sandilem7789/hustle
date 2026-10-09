package com.hustle.economy.controller;

import com.hustle.economy.dto.CommunityStatsResponse;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.OperationsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
public class OperationsController {

    private final OperationsService operationsService;
    private final AuthService authService;

    @GetMapping("/stats")
    public ResponseEntity<List<CommunityStatsResponse>> stats(
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);

        return ResponseEntity.ok(operationsService.stats());
    }
}
