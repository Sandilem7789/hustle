package com.hustle.economy.repository;

import com.hustle.economy.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    long countByBusiness_Id(UUID businessId);

    @Query("SELECT p FROM Product p JOIN FETCH p.business b LEFT JOIN FETCH b.community WHERE b.id = :businessId ORDER BY p.createdAt DESC")
    List<Product> findByBusinessIdFetched(@Param("businessId") UUID businessId);

    @Query("SELECT p FROM Product p JOIN FETCH p.business b LEFT JOIN FETCH b.community WHERE b.community.id = :communityId ORDER BY p.createdAt DESC")
    List<Product> findByCommunityIdFetched(@Param("communityId") UUID communityId);

    @Query("SELECT p FROM Product p JOIN FETCH p.business b LEFT JOIN FETCH b.community ORDER BY p.createdAt DESC")
    List<Product> findAllFetched();
}
