package com.hustle.economy.service;

import com.hustle.economy.dto.CommunityRequest;
import com.hustle.economy.dto.CommunityHustlerResponse;
import com.hustle.economy.dto.CommunityResponse;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.Community;
import com.hustle.economy.mapper.CommunityMapper;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityService {

    private final CommunityRepository communityRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final CommunityMapper communityMapper;

    @Transactional(readOnly = true)
    public List<CommunityResponse> listCommunities() {
        return communityRepository.findAll().stream()
                .map(communityMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CommunityHustlerResponse> listHustlers(UUID communityId) {
        communityRepository.findById(communityId)
                .orElseThrow(() -> new EntityNotFoundException("Community not found"));
        return businessProfileRepository.findByCommunity_IdAndStatus(communityId, ApplicationStatus.APPROVED)
                .stream()
                .map(communityMapper::toHustlerResponse)
                .toList();
    }

    @Transactional
    public CommunityResponse createCommunity(CommunityRequest request) {
        Community community = Community.builder()
                .name(request.getName())
                .region(request.getRegion())
                .description(request.getDescription())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();
        return communityMapper.toResponse(communityRepository.save(community));
    }
}
