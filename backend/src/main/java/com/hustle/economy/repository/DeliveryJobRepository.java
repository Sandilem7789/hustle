package com.hustle.economy.repository;

import com.hustle.economy.entity.DeliveryJob;
import com.hustle.economy.entity.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryJobRepository extends JpaRepository<DeliveryJob, UUID> {
    List<DeliveryJob> findByDriver_IdOrderByCreatedAtDesc(UUID driverId);
    List<DeliveryJob> findByStatusOrderByCreatedAtAsc(JobStatus status);
    Optional<DeliveryJob> findByOrder_Id(UUID orderId);
}
