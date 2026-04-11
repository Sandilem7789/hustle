package com.hustle.economy.repository;

import com.hustle.economy.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCustomer_IdOrderByCreatedAtDesc(UUID customerId);
    List<Order> findByHustlerProfile_IdOrderByCreatedAtDesc(UUID businessProfileId);
}
