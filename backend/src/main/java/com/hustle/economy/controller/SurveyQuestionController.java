package com.hustle.economy.controller;

import com.hustle.economy.dto.SurveyQuestionReorderRequest;
import com.hustle.economy.dto.SurveyQuestionRequest;
import com.hustle.economy.dto.SurveyQuestionResponse;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.SurveyQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/survey-templates/{templateId}/questions")
@RequiredArgsConstructor
public class SurveyQuestionController {

    private final SurveyQuestionService questionService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<SurveyQuestionResponse>> list(
            @PathVariable UUID templateId,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(questionService.listForTemplate(templateId));
    }

    @PostMapping
    public ResponseEntity<SurveyQuestionResponse> create(
            @PathVariable UUID templateId,
            @RequestBody @Valid SurveyQuestionRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(questionService.create(templateId, request));
    }

    @PutMapping("/{questionId}")
    public ResponseEntity<SurveyQuestionResponse> update(
            @PathVariable UUID templateId,
            @PathVariable UUID questionId,
            @RequestBody @Valid SurveyQuestionRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(questionService.update(questionId, request));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<List<SurveyQuestionResponse>> reorder(
            @PathVariable UUID templateId,
            @RequestBody @Valid SurveyQuestionReorderRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        questionService.reorder(templateId, request);
        return ResponseEntity.ok(questionService.listForTemplate(templateId));
    }

    @PatchMapping("/{questionId}/active")
    public ResponseEntity<SurveyQuestionResponse> setActive(
            @PathVariable UUID templateId,
            @PathVariable UUID questionId,
            @RequestBody Map<String, Boolean> body,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        boolean active = Boolean.TRUE.equals(body.get("active"));
        return ResponseEntity.ok(questionService.setActive(questionId, active));
    }

    @DeleteMapping("/{questionId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID templateId,
            @PathVariable UUID questionId,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        questionService.delete(questionId);
        return ResponseEntity.noContent().build();
    }
}
