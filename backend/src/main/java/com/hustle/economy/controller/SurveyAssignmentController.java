package com.hustle.economy.controller;

import com.hustle.economy.dto.*;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.SurveyAssignmentStatus;
import com.hustle.economy.entity.SurveyType;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.SurveyAssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/survey-assignments")
@RequiredArgsConstructor
public class SurveyAssignmentController {

    private final SurveyAssignmentService assignmentService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<List<SurveyAssignmentResponse>> assign(
            @RequestBody @Valid SurveyAssignRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        UUID assignedByUserId = authService.resolveAppUserId(token);
        return ResponseEntity.ok(assignmentService.assign(request, assignedByUserId));
    }

    @GetMapping
    public ResponseEntity<List<SurveyAssignmentResponse>> search(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String templateType,
            @RequestParam(required = false) UUID communityId,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        SurveyAssignmentStatus statusEnum = status != null && !status.isBlank()
                ? SurveyAssignmentStatus.valueOf(status.toUpperCase()) : null;
        SurveyType typeEnum = templateType != null && !templateType.isBlank()
                ? SurveyType.valueOf(templateType.toUpperCase()) : null;
        return ResponseEntity.ok(assignmentService.search(statusEnum, typeEnum, communityId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SurveyAssignmentDetailResponse> getDetail(
            @PathVariable UUID id,
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        UserRole role = authService.resolveRole(token, profile);
        boolean isStaff = role == UserRole.FACILITATOR || role == UserRole.COORDINATOR;
        return ResponseEntity.ok(assignmentService.getDetail(id, isStaff ? null : profile.getId()));
    }

    @PostMapping("/{id}/answers")
    public ResponseEntity<SurveyAssignmentResponse> saveAnswers(
            @PathVariable UUID id,
            @RequestBody @Valid SurveyAnswerSubmitRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(assignmentService.saveAnswers(id, profile.getId(), request));
    }

    @GetMapping("/{id}/answers")
    public ResponseEntity<Map<String, String>> getFlatAnswers(
            @PathVariable UUID id,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(assignmentService.getFlatAnswers(id));
    }
}
