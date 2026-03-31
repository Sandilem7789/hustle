package com.hustle.economy.mapper;

import com.hustle.economy.dto.CommunityResponse;
import com.hustle.economy.dto.HustlerApplicationResponse;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.HustlerApplication;
import org.springframework.stereotype.Component;

@Component
public class HustlerApplicationMapper {

    public HustlerApplicationResponse toResponse(HustlerApplication application) {
        if (application == null) {
            return null;
        }

        return HustlerApplicationResponse.builder()
                .id(application.getId())
                .firstName(application.getFirstName())
                .lastName(application.getLastName())
                .email(application.getEmail())
                .phone(application.getPhone())
                .community(toCommunityResponse(application.getCommunity()))
                .businessName(application.getBusinessName())
                .businessType(application.getBusinessType())
                .description(application.getDescription())
                .vision(application.getVision())
                .mission(application.getMission())
                .targetCustomers(application.getTargetCustomers())
                .operatingArea(application.getOperatingArea())
                .latitude(application.getLatitude())
                .longitude(application.getLongitude())
                .status(application.getStatus())
                .facilitatorNotes(application.getFacilitatorNotes())
                .submittedAt(application.getSubmittedAt())
                .decidedAt(application.getDecidedAt())
                .build();
    }

    private CommunityResponse toCommunityResponse(Community community) {
        if (community == null) {
            return null;
        }

        return CommunityResponse.builder()
                .id(community.getId())
                .name(community.getName())
                .region(community.getRegion())
                .description(community.getDescription())
                .latitude(community.getLatitude())
                .longitude(community.getLongitude())
                .build();
    }
}
