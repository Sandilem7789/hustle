package com.hustle.economy.repository;

import com.hustle.economy.entity.HustlerSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface HustlerSessionRepository extends JpaRepository<HustlerSession, UUID> {
    @Query("SELECT s FROM HustlerSession s JOIN FETCH s.businessProfile bp JOIN FETCH bp.application WHERE s.token = :token")
    Optional<HustlerSession> findByToken(@Param("token") String token);
}
