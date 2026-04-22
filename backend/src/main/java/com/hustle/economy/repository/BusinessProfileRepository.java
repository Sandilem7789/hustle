package com.hustle.economy.repository;

import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BusinessProfileRepository extends JpaRepository<BusinessProfile, UUID> {
    Optional<BusinessProfile> findByApplication_Id(UUID applicationId);
    List<BusinessProfile> findByCommunity_IdAndStatus(UUID communityId, ApplicationStatus status);

    @Query("SELECT bp FROM BusinessProfile bp JOIN FETCH bp.application a JOIN FETCH bp.community c WHERE bp.status = 'APPROVED'")
    List<BusinessProfile> findAllApprovedFetched();

    @Query("SELECT bp.community.id, COUNT(bp) FROM BusinessProfile bp WHERE bp.status = 'APPROVED' AND bp.active = true GROUP BY bp.community.id")
    List<Object[]> countActiveHustlersByCommunity();
}
