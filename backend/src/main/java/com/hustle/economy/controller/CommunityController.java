package com.hustle.economy.controller;

import com.hustle.economy.dto.CommunityRequest;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
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

    @GetMapping
    public ResponseEntity<List<Community>> listCommunities() {
        return ResponseEntity.ok(communityService.listCommunities());
    }

    @GetMapping("/{id}/hustlers")
    public ResponseEntity<List<BusinessProfile>> listHustlers(@PathVariable UUID id) {
        return ResponseEntity.ok(communityService.listHustlers(id));
    }

    @PostMapping
    public ResponseEntity<Community> createCommunity(@RequestBody @Valid CommunityRequest request) {
        return ResponseEntity.ok(communityService.createCommunity(request));
    }
}
