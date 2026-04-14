package com.hustle.economy.repository;

import com.hustle.economy.entity.MonthlyCheckIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MonthlyCheckInRepository extends JpaRepository<MonthlyCheckIn, UUID> {

    @Query("SELECT c FROM MonthlyCheckIn c WHERE c.businessProfile.id = :businessProfileId ORDER BY c.visitMonth DESC")
    List<MonthlyCheckIn> findByBusinessProfileId(@Param("businessProfileId") UUID businessProfileId);

    @Query("SELECT c FROM MonthlyCheckIn c WHERE c.businessProfile.id = :businessProfileId AND c.visitMonth = :visitMonth")
    Optional<MonthlyCheckIn> findByBusinessProfileIdAndVisitMonth(
            @Param("businessProfileId") UUID businessProfileId,
            @Param("visitMonth") String visitMonth);

    @Query("SELECT COUNT(c) > 0 FROM MonthlyCheckIn c WHERE c.businessProfile.id = :businessProfileId AND c.visitMonth = :visitMonth")
    boolean existsByBusinessProfileIdAndVisitMonth(
            @Param("businessProfileId") UUID businessProfileId,
            @Param("visitMonth") String visitMonth);
}
