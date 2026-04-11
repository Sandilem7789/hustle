package com.hustle.economy.service;

import com.hustle.economy.dto.*;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.*;
import com.hustle.economy.util.HaversineUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final double MAX_FOOD_DELIVERY_KM = 60.0;

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final DispatchService dispatchService;

    @Transactional
    public OrderResponse createOrder(OrderRequest req, UUID customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));

        List<OrderItemRequest> itemRequests = req.getItems();

        // Load all products and validate they all belong to the same business profile
        Set<UUID> businessProfileIds = new HashSet<>();
        List<Product> loadedProducts = new ArrayList<>();

        for (OrderItemRequest itemReq : itemRequests) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + itemReq.getProductId()));
            loadedProducts.add(product);
            businessProfileIds.add(product.getBusiness().getId());
        }

        if (businessProfileIds.size() > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "All items in an order must belong to the same hustler");
        }

        UUID businessProfileId = businessProfileIds.iterator().next();
        BusinessProfile hustlerProfile = businessProfileRepository.findById(businessProfileId)
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found"));

        // Haversine distance check for FOOD delivery
        if (req.getFulfillmentType() == FulfillmentType.DELIVERY
                && req.getDeliveryLat() != null && req.getDeliveryLng() != null
                && hustlerProfile.getLatitude() != null && hustlerProfile.getLongitude() != null) {

            boolean hasFood = loadedProducts.stream()
                    .anyMatch(p -> p.getCategory() == ProductCategory.FOOD);

            if (hasFood) {
                double distance = HaversineUtil.distanceKm(
                        hustlerProfile.getLatitude(), hustlerProfile.getLongitude(),
                        req.getDeliveryLat(), req.getDeliveryLng());

                if (distance > MAX_FOOD_DELIVERY_KM) {
                    throw new RuntimeException("Delivery distance exceeds 60km limit for food orders");
                }
            }
        }

        // Build order items and calculate total
        List<OrderItem> orderItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        Order savedOrder = Order.builder()
                .customer(customer)
                .hustlerProfile(hustlerProfile)
                .transactionType(req.getTransactionType() != null ? req.getTransactionType() : TransactionType.B2C)
                .fulfillmentType(req.getFulfillmentType() != null ? req.getFulfillmentType() : FulfillmentType.COLLECTION)
                .deliveryAddress(req.getDeliveryAddress())
                .deliveryLat(req.getDeliveryLat())
                .deliveryLng(req.getDeliveryLng())
                .status(OrderStatus.PENDING)
                .businessPurchaseOrderRef(req.getBusinessPurchaseOrderRef())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .items(new ArrayList<>())
                .build();

        savedOrder = orderRepository.save(savedOrder);

        for (int i = 0; i < itemRequests.size(); i++) {
            OrderItemRequest itemReq = itemRequests.get(i);
            Product product = loadedProducts.get(i);

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(lineTotal);

            OrderItem item = OrderItem.builder()
                    .order(savedOrder)
                    .product(product)
                    .productName(product.getName())
                    .unitPrice(product.getPrice())
                    .quantity(itemReq.getQuantity())
                    .build();
            orderItems.add(item);
        }

        savedOrder.setTotalAmount(total);
        savedOrder.getItems().addAll(orderItems);
        savedOrder = orderRepository.save(savedOrder);

        return toResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrdersByCustomer(UUID customerId) {
        return orderRepository.findByCustomer_IdOrderByCreatedAtDesc(customerId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> listOrdersByHustler(UUID businessProfileId) {
        return orderRepository.findByHustlerProfile_IdOrderByCreatedAtDesc(businessProfileId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse updateOrderStatus(UUID orderId, OrderStatus newStatus, UUID businessProfileId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found"));

        if (!order.getHustlerProfile().getId().equals(businessProfileId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not own this order");
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(OffsetDateTime.now());
        order = orderRepository.save(order);

        if (newStatus == OrderStatus.CONFIRMED && order.getFulfillmentType() == FulfillmentType.DELIVERY) {
            dispatchService.createJob(order);
        }

        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public DistanceCheckResponse validateDistance(DistanceCheckRequest req) {
        BusinessProfile seller = businessProfileRepository.findById(req.getSellerId())
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found"));

        if (seller.getLatitude() == null || seller.getLongitude() == null) {
            return DistanceCheckResponse.builder()
                    .distanceKm(0)
                    .withinLimit(true)
                    .message("Seller location not set; distance check skipped")
                    .build();
        }

        double distance = HaversineUtil.distanceKm(
                seller.getLatitude(), seller.getLongitude(),
                req.getDeliveryLat(), req.getDeliveryLng());

        boolean withinLimit = distance <= MAX_FOOD_DELIVERY_KM;

        return DistanceCheckResponse.builder()
                .distanceKm(distance)
                .withinLimit(withinLimit)
                .message(withinLimit
                        ? "Within delivery range (" + String.format("%.1f", distance) + " km)"
                        : "Outside delivery range (" + String.format("%.1f", distance) + " km)")
                .build();
    }

    private OrderResponse toResponse(Order order) {
        List<OrderItemResponse> items = order.getItems().stream()
                .map(i -> OrderItemResponse.builder()
                        .id(i.getId().toString())
                        .productId(i.getProduct() != null ? i.getProduct().getId().toString() : null)
                        .productName(i.getProductName())
                        .unitPrice(i.getUnitPrice())
                        .quantity(i.getQuantity())
                        .build())
                .toList();

        Customer customer = order.getCustomer();
        BusinessProfile hustler = order.getHustlerProfile();

        return OrderResponse.builder()
                .id(order.getId().toString())
                .customerId(customer.getId().toString())
                .customerName(customer.getFirstName() + " " + customer.getLastName())
                .hustlerName(hustler.getBusinessName())
                .businessProfileId(hustler.getId().toString())
                .transactionType(order.getTransactionType().name())
                .fulfillmentType(order.getFulfillmentType().name())
                .status(order.getStatus().name())
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryLat(order.getDeliveryLat())
                .deliveryLng(order.getDeliveryLng())
                .items(items)
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt().toString())
                .build();
    }
}
