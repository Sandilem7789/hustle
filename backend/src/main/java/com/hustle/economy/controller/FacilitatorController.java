package com.hustle.economy.controller;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.dto.IncomeEntryRequest;
import com.hustle.economy.dto.IncomeEntryResponse;
import com.hustle.economy.dto.MonthlyCheckInRequest;
import com.hustle.economy.dto.MonthlyCheckInResponse;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.FacilitatorService;
import com.hustle.economy.service.IncomeService;
import com.hustle.economy.service.MonthlyCheckInService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/facilitator")
@RequiredArgsConstructor
public class FacilitatorController {

    private final FacilitatorService facilitatorService;
    private final MonthlyCheckInService monthlyCheckInService;
    private final IncomeService incomeService;
    private final AuthService authService;

    @GetMapping("/hustlers")
    public ResponseEntity<List<FacilitatorHustlerResponse>> listHustlers(
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(facilitatorService.listActiveHustlers());
    }

    @PatchMapping("/hustlers/{id}/active")
    public ResponseEntity<FacilitatorHustlerResponse> setActive(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        boolean active = Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(facilitatorService.setActive(id, active));
    }

    @GetMapping("/hustlers/{id}/checkins")
    public ResponseEntity<List<MonthlyCheckInResponse>> listCheckIns(
            @PathVariable UUID id,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(monthlyCheckInService.list(id));
    }

    @PostMapping("/hustlers/{id}/checkins")
    public ResponseEntity<MonthlyCheckInResponse> recordCheckIn(
            @PathVariable UUID id,
            @RequestBody MonthlyCheckInRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(monthlyCheckInService.record(id, request));
    }

    @GetMapping("/hustlers/{id}/income")
    public ResponseEntity<List<IncomeEntryResponse>> listHustlerIncome(
            @PathVariable UUID id,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(incomeService.listMyIncome(id, null, null));
    }

    @PutMapping("/hustlers/{id}/income/{entryId}")
    public ResponseEntity<IncomeEntryResponse> updateHustlerIncome(
            @PathVariable UUID id,
            @PathVariable UUID entryId,
            @RequestBody @Valid IncomeEntryRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(incomeService.updateIncome(entryId, request));
    }
}
