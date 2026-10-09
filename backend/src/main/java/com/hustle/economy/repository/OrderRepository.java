package com.hustle.economy.repository;

import com.hustle.economy.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.customer JOIN FETCH o.hustlerProfile LEFT JOIN FETCH o.items WHERE o.customer.id = :customerId ORDER BY o.createdAt DESC")
    List<Order> findByCustomer_IdOrderByCreatedAtDesc(@Param("customerId") UUID customerId);

    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.customer JOIN FETCH o.hustlerProfile LEFT JOIN FETCH o.items WHERE o.hustlerProfile.id = :businessProfileId ORDER BY o.createdAt DESC")
    List<Order> findByHustlerProfile_IdOrderByCreatedAtDesc(@Param("businessProfileId") UUID businessProfileId);
    Optional<Order> findByPickupToken(String pickupToken);
}
