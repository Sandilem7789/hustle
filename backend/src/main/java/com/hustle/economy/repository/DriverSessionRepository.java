package com.hustle.economy.repository;

import com.hustle.economy.entity.DriverSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface DriverSessionRepository extends JpaRepository<DriverSession, UUID> {
    Optional<DriverSession> findByTokenAndCreatedAtAfter(String token, OffsetDateTime createdAfter);

    long deleteByToken(String token);
}
