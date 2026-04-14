package com.hustle.economy.repository;

import com.hustle.economy.entity.Applicant;
import com.hustle.economy.entity.CallStatus;
import com.hustle.economy.entity.PipelineStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ApplicantRepository extends JpaRepository<Applicant, UUID> {

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community WHERE a.community.id = :communityId ORDER BY a.createdAt DESC")
    List<Applicant> findByCommunityId(@Param("communityId") UUID communityId);

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community WHERE a.community.id = :communityId AND a.pipelineStage = :stage ORDER BY a.createdAt DESC")
    List<Applicant> findByCommunityIdAndStage(@Param("communityId") UUID communityId, @Param("stage") PipelineStage stage);

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community WHERE a.community.id = :communityId AND a.callStatus = :callStatus ORDER BY a.createdAt DESC")
    List<Applicant> findByCommunityIdAndCallStatus(@Param("communityId") UUID communityId, @Param("callStatus") CallStatus callStatus);

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community ORDER BY a.createdAt DESC")
    List<Applicant> findAllFetched();

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community WHERE a.pipelineStage = :stage ORDER BY a.createdAt DESC")
    List<Applicant> findByStage(@Param("stage") PipelineStage stage);

    @Query("SELECT COUNT(a) FROM Applicant a WHERE a.community.id = :communityId AND a.cohortNumber = :cohortNumber AND a.pipelineStage = 'APPROVED'")
    long countApproved(@Param("communityId") UUID communityId, @Param("cohortNumber") Integer cohortNumber);

    @Query("SELECT a FROM Applicant a LEFT JOIN FETCH a.community WHERE a.id = :id")
    java.util.Optional<Applicant> findByIdFetched(@Param("id") UUID id);
}
