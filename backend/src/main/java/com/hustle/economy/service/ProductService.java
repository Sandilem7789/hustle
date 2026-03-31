package com.hustle.economy.service;

import com.hustle.economy.dto.ProductRequest;
import com.hustle.economy.dto.ProductResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Product;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.ProductRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final int MAX_PRODUCTS = 40;

    private final ProductRepository productRepository;
    private final BusinessProfileRepository businessProfileRepository;

    @Transactional
    public ProductResponse createProduct(ProductRequest request, UUID businessProfileId) {
        long count = productRepository.countByBusiness_Id(businessProfileId);
        if (count >= MAX_PRODUCTS) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Product limit of " + MAX_PRODUCTS + " reached for this business");
        }

        BusinessProfile business = businessProfileRepository.findById(businessProfileId)
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

        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listMyProducts(UUID businessProfileId) {
        return productRepository.findByBusinessIdFetched(businessProfileId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listProducts(String communityId) {
        List<Product> products = communityId != null && !communityId.isBlank()
                ? productRepository.findByCommunityIdFetched(UUID.fromString(communityId))
                : productRepository.findAllFetched();
        return products.stream().map(this::toResponse).toList();
    }

    @Transactional
    public void deleteProduct(UUID productId, UUID businessProfileId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if (!product.getBusiness().getId().equals(businessProfileId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this product");
        }
        productRepository.delete(product);
    }

    private ProductResponse toResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .mediaUrl(p.getMediaUrl())
                .businessId(p.getBusiness().getId().toString())
                .businessName(p.getBusiness().getBusinessName())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
