package com.hustle.economy.repository;

import com.hustle.economy.entity.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InterviewRepository extends JpaRepository<Interview, UUID> {

    @Query("SELECT i FROM Interview i LEFT JOIN FETCH i.applicant WHERE i.applicant.id = :applicantId")
    Optional<Interview> findByApplicantId(@Param("applicantId") UUID applicantId);
}
