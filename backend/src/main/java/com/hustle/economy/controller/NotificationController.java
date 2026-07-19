package com.hustle.economy.controller;

import com.hustle.economy.dto.NotificationResponse;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final AuthService authService;

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @PathVariable UUID id,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireAuth(token);
        return ResponseEntity.ok(notificationService.markRead(id));
    }
}
