package com.hustle.economy.repository;

import com.hustle.economy.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByPhone(String phone);
    boolean existsByPhone(String phone);
}
