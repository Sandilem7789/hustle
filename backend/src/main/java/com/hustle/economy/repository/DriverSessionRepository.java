package com.hustle.economy.repository;

import com.hustle.economy.entity.DriverSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DriverSessionRepository extends JpaRepository<DriverSession, UUID> {
    Optional<DriverSession> findByToken(String token);
}
