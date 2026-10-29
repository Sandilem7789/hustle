package com.hustle.economy.service;

import com.hustle.economy.dto.CommunityStatsResponse;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OperationsService {
    private final CommunityRepository communityRepository;
    private final ApplicantRepository applicantRepository;
    private final BusinessProfileRepository businessProfileRepository;

    @Transactional(readOnly = true)
    public List<CommunityStatsResponse> stats() {
        Map<UUID, Map<String, Long>> stageMap = new HashMap<>();
        for (Object[] row : applicantRepository.countByStageAndCommunity()) {
            UUID communityId = (UUID) row[0];
            String stage = row[1].toString();
            long count = (long) row[2];
            stageMap.computeIfAbsent(communityId, k -> new LinkedHashMap<>()).put(stage, count);
        }

        Map<UUID, Long> hustlerMap = new HashMap<>();
        for (Object[] row : businessProfileRepository.countActiveHustlersByCommunity()) {
            hustlerMap.put((UUID) row[0], (long) row[1]);
        }

        return communityRepository.findAll().stream()
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
    }
}
