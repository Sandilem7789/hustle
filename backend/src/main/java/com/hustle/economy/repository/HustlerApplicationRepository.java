package com.hustle.economy.repository;

import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.HustlerApplication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HustlerApplicationRepository extends JpaRepository<HustlerApplication, UUID> {
    List<HustlerApplication> findByStatusOrderBySubmittedAtDesc(ApplicationStatus status);
    List<HustlerApplication> findByStatusAndCommunity_IdOrderBySubmittedAtDesc(ApplicationStatus status, UUID communityId);
}
