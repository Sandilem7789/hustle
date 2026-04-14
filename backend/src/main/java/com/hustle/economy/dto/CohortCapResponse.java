package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class CohortCapResponse {
    private UUID communityId;
    private String communityName;
    private Integer cohortNumber;
    private long approvedCount;
    private int cap;
    private boolean atCap;
}
