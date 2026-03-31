package com.hustle.economy.repository;

import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.HustlerApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HustlerApplicationRepository extends JpaRepository<HustlerApplication, UUID> {
    @Query("SELECT a FROM HustlerApplication a LEFT JOIN FETCH a.community WHERE a.status = :status ORDER BY a.submittedAt DESC")
    List<HustlerApplication> findByStatusOrderBySubmittedAtDesc(@Param("status") ApplicationStatus status);

    @Query("SELECT a FROM HustlerApplication a LEFT JOIN FETCH a.community WHERE a.status = :status AND a.community.id = :communityId ORDER BY a.submittedAt DESC")
    List<HustlerApplication> findByStatusAndCommunity_IdOrderBySubmittedAtDesc(@Param("status") ApplicationStatus status, @Param("communityId") UUID communityId);

    Optional<HustlerApplication> findByPhone(String phone);

    @Query("SELECT a FROM HustlerApplication a LEFT JOIN FETCH a.community WHERE a.id = :id")
    Optional<HustlerApplication> findByIdFetched(@Param("id") UUID id);
}
