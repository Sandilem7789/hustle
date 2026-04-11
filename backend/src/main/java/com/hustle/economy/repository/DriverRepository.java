package com.hustle.economy.repository;

import com.hustle.economy.entity.Driver;
import com.hustle.economy.entity.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DriverRepository extends JpaRepository<Driver, UUID> {
    Optional<Driver> findByPhone(String phone);
    List<Driver> findByCommunityBase_IdAndStatus(UUID communityId, DriverStatus status);
}
