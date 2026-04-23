package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class CommunityStatsResponse {
    private UUID communityId;
    private String communityName;
    private String province;
    private String region;
    private Double latitude;
    private Double longitude;
    private long totalApplicants;
    private long activeHustlers;
    private Map<String, Long> stageBreakdown;
}
