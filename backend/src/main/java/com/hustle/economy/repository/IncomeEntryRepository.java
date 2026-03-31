package com.hustle.economy.repository;

import com.hustle.economy.entity.IncomeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface IncomeEntryRepository extends JpaRepository<IncomeEntry, UUID> {

    @Query("SELECT e FROM IncomeEntry e WHERE e.businessProfile.id = :bId ORDER BY e.date DESC, e.createdAt DESC")
    List<IncomeEntry> findByBusinessProfileId(@Param("bId") UUID businessProfileId);

    @Query("SELECT e FROM IncomeEntry e WHERE e.businessProfile.id = :bId AND e.date >= :from AND e.date <= :to ORDER BY e.date DESC")
    List<IncomeEntry> findByBusinessProfileIdAndDateBetween(@Param("bId") UUID businessProfileId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT e FROM IncomeEntry e JOIN FETCH e.businessProfile bp JOIN FETCH bp.community WHERE bp.community.id = :communityId AND e.date >= :from ORDER BY e.date DESC")
    List<IncomeEntry> findByCommunityAndDateFrom(@Param("communityId") UUID communityId, @Param("from") LocalDate from);
}
