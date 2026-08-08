package com.hustle.economy.repository;

import com.hustle.economy.entity.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {
    Page<Sale> findByBusinessProfile_Id(UUID businessProfileId, Pageable pageable);
}
