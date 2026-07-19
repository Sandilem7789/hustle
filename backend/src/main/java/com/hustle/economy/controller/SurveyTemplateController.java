package com.hustle.economy.controller;

import com.hustle.economy.dto.SurveyTemplateRequest;
import com.hustle.economy.dto.SurveyTemplateResponse;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.SurveyTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/survey-templates")
@RequiredArgsConstructor
public class SurveyTemplateController {

    private final SurveyTemplateService templateService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<SurveyTemplateResponse>> list(
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(templateService.list());
    }

    @PostMapping
    public ResponseEntity<SurveyTemplateResponse> create(
            @RequestBody @Valid SurveyTemplateRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(templateService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SurveyTemplateResponse> update(
            @PathVariable UUID id,
            @RequestBody @Valid SurveyTemplateRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(templateService.update(id, request));
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<SurveyTemplateResponse> setActive(
            @PathVariable UUID id,
            @RequestBody Map<String, Boolean> body,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        boolean active = Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(templateService.setActive(id, active));
    }
}
