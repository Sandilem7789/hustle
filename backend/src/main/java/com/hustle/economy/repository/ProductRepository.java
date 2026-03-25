package com.hustle.economy.repository;

import com.hustle.economy.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByBusiness_Community_Id(UUID communityId);
}
