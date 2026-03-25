package com.hustle.economy.controller;

import com.hustle.economy.dto.HustlerApplicationRequest;
import com.hustle.economy.dto.HustlerDecisionRequest;
import com.hustle.economy.entity.HustlerApplication;
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

    @PostMapping
    public ResponseEntity<HustlerApplication> createApplication(@RequestBody @Valid HustlerApplicationRequest request) {
        return ResponseEntity.ok(hustlerApplicationService.createApplication(request));
    }

    @GetMapping
    public ResponseEntity<List<HustlerApplication>> listApplications(@RequestParam(required = false) String status,
                                                                    @RequestParam(required = false) String communityId) {
        return ResponseEntity.ok(hustlerApplicationService.listApplications(status, communityId));
    }

    @PatchMapping("/{id}/decision")
    public ResponseEntity<HustlerApplication> decide(@PathVariable UUID id,
                                                     @RequestBody @Valid HustlerDecisionRequest request) {
        return ResponseEntity.ok(hustlerApplicationService.decide(id, request));
    }
}
