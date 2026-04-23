package com.hustle.economy.controller;

import com.hustle.economy.dto.CommunityStatsResponse;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.UserRole;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/operations")
@RequiredArgsConstructor
public class OperationsController {

    private final CommunityRepository communityRepository;
    private final ApplicantRepository applicantRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final AuthService authService;

    @GetMapping("/stats")
    public ResponseEntity<List<CommunityStatsResponse>> stats(
            @RequestHeader("X-Auth-Token") String token) {
        authService.requireRole(token, UserRole.FACILITATOR, UserRole.COORDINATOR);

        // Build stage breakdown map keyed by communityId
        Map<UUID, Map<String, Long>> stageMap = new HashMap<>();
        for (Object[] row : applicantRepository.countByStageAndCommunity()) {
            UUID communityId = (UUID) row[0];
            String stage = row[1].toString();
            long count = (long) row[2];
            stageMap.computeIfAbsent(communityId, k -> new LinkedHashMap<>()).put(stage, count);
        }

        // Build active hustler count keyed by communityId
        Map<UUID, Long> hustlerMap = new HashMap<>();
        for (Object[] row : businessProfileRepository.countActiveHustlersByCommunity()) {
            hustlerMap.put((UUID) row[0], (long) row[1]);
        }

        List<Community> communities = communityRepository.findAll();
        List<CommunityStatsResponse> result = communities.stream()
                .map(c -> CommunityStatsResponse.builder()
                        .communityId(c.getId())
                        .communityName(c.getName())
                        .province(c.getProvince())
                        .region(c.getRegion())
                        .latitude(c.getLatitude())
                        .longitude(c.getLongitude())
                        .totalApplicants(applicantRepository.countByCommunityId(c.getId()))
                        .activeHustlers(hustlerMap.getOrDefault(c.getId(), 0L))
                        .stageBreakdown(stageMap.getOrDefault(c.getId(), Map.of()))
                        .build())
                .toList();

        return ResponseEntity.ok(result);
    }
}
