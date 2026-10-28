package com.hustle.economy.repository;

import com.hustle.economy.entity.CustomerSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface CustomerSessionRepository extends JpaRepository<CustomerSession, UUID> {
    Optional<CustomerSession> findByTokenAndCreatedAtAfter(String token, OffsetDateTime createdAfter);

    long deleteByToken(String token);
}
