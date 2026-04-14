package com.hustle.economy.controller;

import com.hustle.economy.dto.*;
import com.hustle.economy.service.ApplicantService;
import com.hustle.economy.service.BusinessVerificationService;
import com.hustle.economy.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/applicants")
@RequiredArgsConstructor
public class ApplicantController {

    private final ApplicantService applicantService;
    private final InterviewService interviewService;
    private final BusinessVerificationService verificationService;

    @PostMapping
    public ResponseEntity<ApplicantResponse> create(@RequestBody @Valid ApplicantRequest request) {
        return ResponseEntity.ok(applicantService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<ApplicantResponse>> list(
            @RequestParam(required = false) String communityId,
            @RequestParam(required = false) String stage,
            @RequestParam(required = false) String callStatus) {
        return ResponseEntity.ok(applicantService.list(communityId, stage, callStatus));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicantResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(applicantService.getById(id));
    }

    @PatchMapping("/{id}/call")
    public ResponseEntity<ApplicantResponse> updateCallStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(applicantService.updateCallStatus(id, body.get("callStatus")));
    }

    @PatchMapping("/{id}/stage")
    public ResponseEntity<ApplicantResponse> updateStage(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(applicantService.updateStage(id, body.get("stage"), body.get("reason")));
    }

    @GetMapping("/cap-status")
    public ResponseEntity<CohortCapResponse> getCapStatus(
            @RequestParam UUID communityId,
            @RequestParam(defaultValue = "1") int cohortNumber) {
        return ResponseEntity.ok(applicantService.getCapStatus(communityId, cohortNumber));
    }

    // ── Account activation ────────────────────────────────────────────────────

    @PostMapping("/{id}/activate")
    public ResponseEntity<ActivateApplicantResponse> activate(@PathVariable UUID id) {
        return ResponseEntity.ok(applicantService.activate(id));
    }

    // ── Interview endpoints ──────────────────────────────────────────────────

    @GetMapping("/{id}/interview")
    public ResponseEntity<InterviewResponse> getInterview(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.getByApplicant(id));
    }

    @PatchMapping("/{id}/interview/schedule")
    public ResponseEntity<InterviewResponse> scheduleInterview(
            @PathVariable UUID id,
            @RequestBody @Valid InterviewScheduleRequest request) {
        return ResponseEntity.ok(interviewService.scheduleInterview(id, request));
    }

    @PostMapping("/{id}/interview")
    public ResponseEntity<InterviewResponse> recordInterview(
            @PathVariable UUID id,
            @RequestBody @Valid InterviewRequest request) {
        return ResponseEntity.ok(interviewService.recordOutcome(id, request));
    }

    // ── Business verification endpoints ──────────────────────────────────────

    @GetMapping("/{id}/verification")
    public ResponseEntity<BusinessVerificationResponse> getVerification(@PathVariable UUID id) {
        return ResponseEntity.ok(verificationService.getByApplicant(id));
    }

    @PostMapping("/{id}/verification")
    public ResponseEntity<BusinessVerificationResponse> recordVerification(
            @PathVariable UUID id,
            @RequestBody @Valid BusinessVerificationRequest request) {
        return ResponseEntity.ok(verificationService.recordVerification(id, request));
    }
}
