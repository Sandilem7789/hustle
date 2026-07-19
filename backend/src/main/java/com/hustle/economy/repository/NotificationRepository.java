package com.hustle.economy.repository;

import com.hustle.economy.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByBusinessProfile_IdOrderByCreatedAtDesc(UUID businessProfileId);
}
