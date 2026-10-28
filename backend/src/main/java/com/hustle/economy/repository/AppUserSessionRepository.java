package com.hustle.economy.repository;

import com.hustle.economy.entity.AppUserSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface AppUserSessionRepository extends JpaRepository<AppUserSession, UUID> {
    Optional<AppUserSession> findByTokenAndCreatedAtAfter(String token, OffsetDateTime createdAfter);

    long deleteByToken(String token);
}
