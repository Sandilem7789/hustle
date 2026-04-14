package com.hustle.economy.controller;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.dto.MonthlyCheckInRequest;
import com.hustle.economy.dto.MonthlyCheckInResponse;
import com.hustle.economy.service.FacilitatorService;
import com.hustle.economy.service.MonthlyCheckInService;
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

    @GetMapping("/hustlers")
    public ResponseEntity<List<FacilitatorHustlerResponse>> listHustlers() {
        return ResponseEntity.ok(facilitatorService.listActiveHustlers());
    }

    @PatchMapping("/hustlers/{id}/active")
    public ResponseEntity<FacilitatorHustlerResponse> setActive(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body) {
        boolean active = Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(facilitatorService.setActive(id, active));
    }

    // ── Monthly check-ins ─────────────────────────────────────────────────

    @GetMapping("/hustlers/{id}/checkins")
    public ResponseEntity<List<MonthlyCheckInResponse>> listCheckIns(@PathVariable UUID id) {
        return ResponseEntity.ok(monthlyCheckInService.list(id));
    }

    @PostMapping("/hustlers/{id}/checkins")
    public ResponseEntity<MonthlyCheckInResponse> recordCheckIn(
            @PathVariable UUID id,
            @RequestBody MonthlyCheckInRequest request) {
        return ResponseEntity.ok(monthlyCheckInService.record(id, request));
    }
}
