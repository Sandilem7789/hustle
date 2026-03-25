package com.hustle.economy.repository;

import com.hustle.economy.entity.BusinessProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessProfileRepository extends JpaRepository<BusinessProfile, UUID> {
    Optional<BusinessProfile> findByApplication_Id(UUID applicationId);
    List<BusinessProfile> findByCommunity_IdAndStatus(UUID communityId, com.hustle.economy.entity.ApplicationStatus status);
}
