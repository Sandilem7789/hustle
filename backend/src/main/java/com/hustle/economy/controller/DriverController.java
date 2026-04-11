package com.hustle.economy.controller;

import com.hustle.economy.dto.*;
import com.hustle.economy.entity.Driver;
import com.hustle.economy.service.DispatchService;
import com.hustle.economy.service.DriverAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverAuthService driverAuthService;
    private final DispatchService dispatchService;

    @PostMapping("/register")
    public ResponseEntity<DriverAuthResponse> register(@RequestBody DriverRegisterRequest req) {
        return ResponseEntity.ok(driverAuthService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<DriverAuthResponse> login(@RequestBody DriverLoginRequest req) {
        return ResponseEntity.ok(driverAuthService.login(req));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<DeliveryJobResponse>> openJobs(
            @RequestHeader("X-Driver-Token") String token) {
        Driver driver = driverAuthService.requireAuth(token);
        return ResponseEntity.ok(dispatchService.listOpenJobs(driver.getCommunityBase().getId()));
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<List<DeliveryJobResponse>> myJobs(
            @RequestHeader("X-Driver-Token") String token) {
        Driver driver = driverAuthService.requireAuth(token);
        return ResponseEntity.ok(dispatchService.listDriverJobs(driver.getId()));
    }

    @PostMapping("/jobs/{jobId}/accept")
    public ResponseEntity<DeliveryJobResponse> acceptJob(
            @RequestHeader("X-Driver-Token") String token,
            @PathVariable UUID jobId) {
        Driver driver = driverAuthService.requireAuth(token);
        return ResponseEntity.ok(dispatchService.acceptJob(jobId, driver.getId()));
    }

    @PatchMapping("/jobs/{jobId}/status")
    public ResponseEntity<DeliveryJobResponse> updateJobStatus(
            @RequestHeader("X-Driver-Token") String token,
            @PathVariable UUID jobId,
            @RequestBody @Valid DeliveryStatusUpdateRequest req) {
        Driver driver = driverAuthService.requireAuth(token);
        return ResponseEntity.ok(dispatchService.updateJobStatus(
                jobId, driver.getId(), req.getStatus(), req.getProofPhotoUrl()));
    }
}
