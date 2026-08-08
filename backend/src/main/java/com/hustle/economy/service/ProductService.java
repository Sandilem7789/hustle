package com.hustle.economy.service;

import com.hustle.economy.dto.ProductRequest;
import com.hustle.economy.dto.ProductResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Product;
import com.hustle.economy.entity.ProductCategory;
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

        String barcode = normalizeBarcode(request.getBarcode());
        if (barcode != null) {
            productRepository.findByBusiness_IdAndBarcode(businessProfileId, barcode).ifPresent(p -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A product with this barcode already exists in your shop");
            });
        }

        Product product = Product.builder()
                .business(business)
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .mediaUrl(request.getMediaUrl())
                .category(request.getCategory() != null ? request.getCategory() : ProductCategory.OTHER)
                .barcode(barcode)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ProductResponse getByBarcode(String barcode, UUID businessProfileId) {
        Product product = productRepository.findByBusiness_IdAndBarcode(businessProfileId, normalizeBarcode(barcode))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No product with this barcode"));
        return toResponse(product);
    }

    private String normalizeBarcode(String barcode) {
        if (barcode == null || barcode.isBlank()) {
            return null;
        }
        return barcode.trim();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listMyProducts(UUID businessProfileId) {
        return productRepository.findByBusinessIdFetched(businessProfileId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> listProducts(String communityId, String category, String businessId) {
        List<Product> products;
        if (businessId != null && !businessId.isBlank()) {
            products = productRepository.findByBusinessIdFetched(UUID.fromString(businessId));
        } else if (communityId != null && !communityId.isBlank()) {
            products = productRepository.findByCommunityIdFetched(UUID.fromString(communityId));
        } else {
            products = productRepository.findAllFetched();
        }
        if (category != null && !category.isBlank()) {
            ProductCategory cat = ProductCategory.valueOf(category.toUpperCase());
            products = products.stream().filter(p -> cat.equals(p.getCategory())).toList();
        }
        return products.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProductResponse updateProduct(UUID productId, ProductRequest request, UUID businessProfileId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new EntityNotFoundException("Product not found"));
        if (!product.getBusiness().getId().equals(businessProfileId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this product");
        }
        product.setName(request.getName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        if (request.getMediaUrl() != null) {
            product.setMediaUrl(request.getMediaUrl());
        }
        if (request.getCategory() != null) {
            product.setCategory(request.getCategory());
        }
        if (request.getBarcode() != null) {
            String barcode = normalizeBarcode(request.getBarcode());
            if (barcode != null && !barcode.equals(product.getBarcode())) {
                productRepository.findByBusiness_IdAndBarcode(businessProfileId, barcode).ifPresent(p -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "A product with this barcode already exists in your shop");
                });
            }
            product.setBarcode(barcode);
        }
        product.setUpdatedAt(OffsetDateTime.now());
        return toResponse(productRepository.save(product));
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
                .category(p.getCategory())
                .barcode(p.getBarcode())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
