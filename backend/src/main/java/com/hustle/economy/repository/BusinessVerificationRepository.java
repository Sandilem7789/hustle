package com.hustle.economy.repository;

import com.hustle.economy.entity.BusinessVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface BusinessVerificationRepository extends JpaRepository<BusinessVerification, UUID> {

    @Query("SELECT v FROM BusinessVerification v LEFT JOIN FETCH v.applicant WHERE v.applicant.id = :applicantId")
    Optional<BusinessVerification> findByApplicantId(@Param("applicantId") UUID applicantId);
}
