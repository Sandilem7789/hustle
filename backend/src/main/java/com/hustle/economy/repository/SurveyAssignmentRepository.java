package com.hustle.economy.repository;

import com.hustle.economy.entity.SurveyAssignment;
import com.hustle.economy.entity.SurveyAssignmentStatus;
import com.hustle.economy.entity.SurveyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SurveyAssignmentRepository extends JpaRepository<SurveyAssignment, UUID> {
    List<SurveyAssignment> findByBusinessProfile_IdOrderByAssignedAtDesc(UUID businessProfileId);

    @Query("""
            SELECT a FROM SurveyAssignment a
            JOIN FETCH a.template t
            JOIN FETCH a.businessProfile bp
            WHERE (:status IS NULL OR a.status = :status)
              AND (:templateType IS NULL OR t.type = :templateType)
              AND (:communityId IS NULL OR bp.community.id = :communityId)
            ORDER BY a.assignedAt DESC
            """)
    List<SurveyAssignment> search(
            @Param("status") SurveyAssignmentStatus status,
            @Param("templateType") SurveyType templateType,
            @Param("communityId") UUID communityId);
}
