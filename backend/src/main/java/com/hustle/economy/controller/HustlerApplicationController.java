package com.hustle.economy.controller;

import com.hustle.economy.dto.HustlerApplicationRequest;
import com.hustle.economy.dto.HustlerApplicationResponse;
import com.hustle.economy.dto.HustlerDecisionRequest;
import com.hustle.economy.dto.HustlerProfileUpdateRequest;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.mapper.HustlerApplicationMapper;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.HustlerApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/hustlers")
@RequiredArgsConstructor
public class HustlerApplicationController {

    private final HustlerApplicationService hustlerApplicationService;
    private final HustlerApplicationMapper hustlerApplicationMapper;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<HustlerApplicationResponse> createApplication(@RequestBody @Valid HustlerApplicationRequest request) {
        return ResponseEntity.ok(hustlerApplicationMapper.toResponse(hustlerApplicationService.createApplication(request)));
    }

    @GetMapping
    public ResponseEntity<List<HustlerApplicationResponse>> listApplications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String communityId,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(hustlerApplicationService.listApplications(status, communityId).stream()
                .map(hustlerApplicationMapper::toResponse)
                .toList());
    }

    @PatchMapping("/{id}/decision")
    public ResponseEntity<HustlerApplicationResponse> decide(
            @PathVariable UUID id,
            @RequestBody @Valid HustlerDecisionRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(hustlerApplicationMapper.toResponse(hustlerApplicationService.decide(id, request)));
    }

    @PatchMapping("/{id}/profile")
    public ResponseEntity<HustlerApplicationResponse> updateProfile(
            @PathVariable UUID id,
            @RequestBody HustlerProfileUpdateRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(hustlerApplicationMapper.toResponse(hustlerApplicationService.updateProfile(id, request)));
    }
}
