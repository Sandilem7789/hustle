package com.hustle.economy.mapper;

import com.hustle.economy.dto.CommunityHustlerResponse;
import com.hustle.economy.dto.CommunityResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import org.springframework.stereotype.Component;

@Component
public class CommunityMapper {
    public CommunityResponse toResponse(Community community) {
        return CommunityResponse.builder()
                .id(community.getId())
                .name(community.getName())
                .province(community.getProvince())
                .region(community.getRegion())
                .description(community.getDescription())
                .latitude(community.getLatitude())
                .longitude(community.getLongitude())
                .build();
    }

    public CommunityHustlerResponse toHustlerResponse(BusinessProfile profile) {
        return CommunityHustlerResponse.builder()
                .id(profile.getId())
                .businessName(profile.getBusinessName())
                .businessType(profile.getBusinessType())
                .description(profile.getDescription())
                .operatingArea(profile.getOperatingArea())
                .community(toResponse(profile.getCommunity()))
                .build();
    }
}
