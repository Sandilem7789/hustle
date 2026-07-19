package com.hustle.economy.controller;

import com.hustle.economy.dto.NotificationResponse;
import com.hustle.economy.dto.SurveyAssignmentResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.NotificationService;
import com.hustle.economy.service.SurveyAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hustlers/me")
@RequiredArgsConstructor
public class HustlerSelfServiceController {

    private final AuthService authService;
    private final SurveyAssignmentService assignmentService;
    private final NotificationService notificationService;

    @GetMapping("/survey-assignments")
    public ResponseEntity<List<SurveyAssignmentResponse>> mySurveyAssignments(
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(assignmentService.listForBusinessProfile(profile.getId()));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationResponse>> myNotifications(
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(notificationService.listForBusinessProfile(profile.getId()));
    }
}
