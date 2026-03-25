package com.hustle.economy.service;

import com.hustle.economy.dto.ProductRequest;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Product;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final BusinessProfileRepository businessProfileRepository;

    @Transactional
    public Product createProduct(ProductRequest request) {
        BusinessProfile business = businessProfileRepository.findById(UUID.fromString(request.getBusinessId()))
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found"));

        Product product = Product.builder()
                .business(business)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .mediaUrl(request.getMediaUrl())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<Product> listProducts(String communityId) {
        if (communityId != null && !communityId.isBlank()) {
            return productRepository.findByBusiness_Community_Id(UUID.fromString(communityId));
        }
        return productRepository.findAll();
    }
}
