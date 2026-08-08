package com.hustle.economy.service;

import com.hustle.economy.dto.SaleItemRequest;
import com.hustle.economy.dto.SaleItemResponse;
import com.hustle.economy.dto.SaleRequest;
import com.hustle.economy.dto.SaleResponse;
import com.hustle.economy.dto.SalesPageResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.EntryType;
import com.hustle.economy.entity.IncomeEntry;
import com.hustle.economy.entity.Product;
import com.hustle.economy.entity.Sale;
import com.hustle.economy.entity.SaleItem;
import com.hustle.economy.repository.IncomeEntryRepository;
import com.hustle.economy.repository.ProductRepository;
import com.hustle.economy.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final IncomeEntryRepository incomeEntryRepository;

    @Transactional
    public SaleResponse createSale(SaleRequest request, BusinessProfile profile) {
        var existing = saleRepository.findById(request.getId());
        if (existing.isPresent()) {
            if (!existing.get().getBusinessProfile().getId().equals(profile.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this sale");
            }
            return toResponse(existing.get());
        }

        Sale sale = Sale.builder()
                .id(request.getId())
                .businessProfile(profile)
                .saleDate(OffsetDateTime.now())
                .createdAt(OffsetDateTime.now())
                .build();

        List<SaleItem> items = new ArrayList<>();
        BigDecimal computedTotal = BigDecimal.ZERO;

        for (SaleItemRequest itemRequest : request.getItems()) {
            Product product = null;
            String itemName = itemRequest.getItemName();

            if (itemRequest.getProductId() != null) {
                product = productRepository.findById(itemRequest.getProductId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
                if (!product.getBusiness().getId().equals(profile.getId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Product does not belong to your business");
                }
                if (itemName == null || itemName.isBlank()) {
                    itemName = product.getName();
                }
            }
            if (itemName == null || itemName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each item needs a name");
            }

            BigDecimal lineTotal = itemRequest.getUnitPrice().multiply(BigDecimal.valueOf(itemRequest.getQuantity()));
            computedTotal = computedTotal.add(lineTotal);

            items.add(SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .itemName(itemName)
                    .unitPrice(itemRequest.getUnitPrice())
                    .quantity(itemRequest.getQuantity())
                    .lineTotal(lineTotal)
                    .build());
        }

        if (request.getTotalAmount().compareTo(computedTotal) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Total amount does not match the sum of item lines");
        }

        sale.setTotalAmount(computedTotal);
        sale.setItems(items);
        Sale saved = saleRepository.save(sale);

        IncomeEntry incomeEntry = IncomeEntry.builder()
                .businessProfile(profile)
                .date(LocalDate.now())
                .amount(computedTotal)
                .channel("CASH")
                .entryType(EntryType.INCOME)
                .category("CASH_SALES")
                .notes("POS sale: " + summarizeItems(items))
                .createdAt(OffsetDateTime.now())
                .build();
        incomeEntryRepository.save(incomeEntry);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SalesPageResponse listSales(UUID businessProfileId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "saleDate"));
        Page<Sale> result = saleRepository.findByBusinessProfile_Id(businessProfileId, pageable);
        return SalesPageResponse.builder()
                .content(result.getContent().stream().map(this::toResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();
    }

    private String summarizeItems(List<SaleItem> items) {
        return items.stream()
                .map(i -> i.getQuantity() + "x " + i.getItemName())
                .collect(Collectors.joining(", "));
    }

    private SaleResponse toResponse(Sale sale) {
        List<SaleItemResponse> items = sale.getItems().stream()
                .map(i -> SaleItemResponse.builder()
                        .productId(i.getProduct() != null ? i.getProduct().getId() : null)
                        .itemName(i.getItemName())
                        .unitPrice(i.getUnitPrice())
                        .quantity(i.getQuantity())
                        .lineTotal(i.getLineTotal())
                        .build())
                .toList();

        return SaleResponse.builder()
                .id(sale.getId())
                .totalAmount(sale.getTotalAmount())
                .saleDate(sale.getSaleDate())
                .createdAt(sale.getCreatedAt())
                .items(items)
                .build();
    }
}
