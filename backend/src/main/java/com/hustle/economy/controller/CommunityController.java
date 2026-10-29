package com.hustle.economy.controller;

import com.hustle.economy.dto.CommunityRequest;
import com.hustle.economy.dto.CommunityHustlerResponse;
import com.hustle.economy.dto.CommunityResponse;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.CommunityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/communities")
@RequiredArgsConstructor
public class CommunityController {

    private final CommunityService communityService;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<CommunityResponse>> listCommunities() {
        return ResponseEntity.ok(communityService.listCommunities());
    }

    @GetMapping("/{id}/hustlers")
    public ResponseEntity<List<CommunityHustlerResponse>> listHustlers(@PathVariable UUID id) {
        return ResponseEntity.ok(communityService.listHustlers(id));
    }

    @PostMapping
    public ResponseEntity<CommunityResponse> createCommunity(
            @RequestBody @Valid CommunityRequest request,
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);
        return ResponseEntity.ok(communityService.createCommunity(request));
    }
}
