package com.hustle.economy.repository;

import com.hustle.economy.entity.Community;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CommunityRepository extends JpaRepository<Community, UUID> {
    Optional<Community> findByNameIgnoreCase(String name);
}
