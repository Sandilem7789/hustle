package com.hustle.economy.controller;

import com.hustle.economy.dto.DriverResponse;
import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.entity.DriverStatus;
import com.hustle.economy.service.FacilitatorService;
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

    @GetMapping("/drivers")
    public ResponseEntity<List<DriverResponse>> listDrivers() {
        return ResponseEntity.ok(facilitatorService.listAllDrivers());
    }

    @PatchMapping("/drivers/{id}/status")
    public ResponseEntity<DriverResponse> updateDriverStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        DriverStatus newStatus = DriverStatus.valueOf(body.get("status"));
        return ResponseEntity.ok(facilitatorService.updateDriverStatus(id, newStatus));
    }
}
