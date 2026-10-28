package com.hustle.economy.repository;

import com.hustle.economy.entity.HustlerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface HustlerSessionRepository extends JpaRepository<HustlerSession, UUID> {
    @Query("SELECT s FROM HustlerSession s JOIN FETCH s.businessProfile bp JOIN FETCH bp.application WHERE s.token = :token AND s.createdAt > :createdAfter")
    Optional<HustlerSession> findByTokenAndCreatedAtAfter(@Param("token") String token,
                                                         @Param("createdAfter") OffsetDateTime createdAfter);

    long deleteByToken(String token);
}
