package com.hustle.economy.controller;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.service.FacilitatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/facilitator")
@RequiredArgsConstructor
public class FacilitatorController {

    private final FacilitatorService facilitatorService;

    @GetMapping("/hustlers")
    public ResponseEntity<List<FacilitatorHustlerResponse>> listHustlers() {
        return ResponseEntity.ok(facilitatorService.listActiveHustlers());
    }
}
