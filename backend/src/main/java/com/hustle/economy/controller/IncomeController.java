package com.hustle.economy.controller;

import com.hustle.economy.dto.IncomeEntryRequest;
import com.hustle.economy.dto.IncomeEntryResponse;
import com.hustle.economy.dto.IncomeSummaryResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.IncomeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/income")
@RequiredArgsConstructor
public class IncomeController {

    private final IncomeService incomeService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<IncomeEntryResponse> log(
            @RequestHeader("X-Auth-Token") String token,
            @RequestBody @Valid IncomeEntryRequest request) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(incomeService.logIncome(request, profile));
    }

    @GetMapping("/my")
    public ResponseEntity<List<IncomeEntryResponse>> listMy(
            @RequestHeader("X-Auth-Token") String token,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(incomeService.listMyIncome(profile.getId(), from, to));
    }

    @GetMapping("/summary")
    public ResponseEntity<IncomeSummaryResponse> summary(
            @RequestHeader("X-Auth-Token") String token) {
        BusinessProfile profile = authService.requireAuth(token);
        return ResponseEntity.ok(incomeService.getSummary(profile.getId()));
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(
            @RequestHeader("X-Auth-Token") String token,
            @RequestParam(defaultValue = "weekly") String period) {
        BusinessProfile profile = authService.requireAuth(token);
        String csv = incomeService.generateCsv(profile.getId(), period);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"income-" + period + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
