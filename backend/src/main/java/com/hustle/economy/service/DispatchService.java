package com.hustle.economy.service;

import com.hustle.economy.dto.DeliveryJobResponse;
import com.hustle.economy.dto.OrderItemResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.DeliveryJobRepository;
import com.hustle.economy.repository.DriverRepository;
import com.hustle.economy.repository.OrderRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DispatchService {

    private final DeliveryJobRepository deliveryJobRepository;
    private final DriverRepository driverRepository;
    private final OrderRepository orderRepository;

    private static final BigDecimal DRIVER_CUT_RATE = new BigDecimal("0.10");
    private static final BigDecimal MIN_PAYOUT = new BigDecimal("10.00");

    @Transactional
    public DeliveryJob createJob(Order order) {
        BigDecimal rawPayout = order.getTotalAmount()
                .multiply(DRIVER_CUT_RATE)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal payout = rawPayout.compareTo(MIN_PAYOUT) < 0 ? MIN_PAYOUT : rawPayout;

        DeliveryJob job = DeliveryJob.builder()
                .order(order)
                .driver(null)
                .status(JobStatus.OPEN)
                .payoutAmount(payout)
                .createdAt(OffsetDateTime.now())
                .build();

        return deliveryJobRepository.save(job);
    }

    @Transactional
    public DeliveryJobResponse acceptJob(UUID jobId, UUID driverId) {
        DeliveryJob job = deliveryJobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Delivery job not found"));

        if (job.getStatus() != JobStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Job is no longer available");
        }

        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver not found"));

        if (driver.getStatus() != DriverStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Driver account is not active");
        }

        boolean hasActiveJob = deliveryJobRepository.findByDriver_IdOrderByCreatedAtDesc(driverId)
                .stream()
                .anyMatch(j -> j.getStatus() == JobStatus.ASSIGNED
                        || j.getStatus() == JobStatus.PICKED_UP
                        || j.getStatus() == JobStatus.EN_ROUTE);

        if (hasActiveJob) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have an active delivery");
        }

        job.setDriver(driver);
        job.setStatus(JobStatus.ASSIGNED);
        job.setAcceptedAt(OffsetDateTime.now());

        Order order = job.getOrder();
        order.setStatus(OrderStatus.DRIVER_ASSIGNED);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        return toResponse(deliveryJobRepository.save(job));
    }

    @Transactional
    public DeliveryJobResponse updateJobStatus(UUID jobId, UUID driverId, JobStatus newStatus, String proofPhotoUrl) {
        DeliveryJob job = deliveryJobRepository.findById(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Delivery job not found"));

        if (job.getDriver() == null || !job.getDriver().getId().equals(driverId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not assigned to this job");
        }

        validateTransition(job.getStatus(), newStatus);

        job.setStatus(newStatus);

        if (newStatus == JobStatus.DELIVERED) {
            job.setDeliveredAt(OffsetDateTime.now());
            if (proofPhotoUrl != null) {
                job.setProofPhotoUrl(proofPhotoUrl);
            }
            Order order = job.getOrder();
            order.setStatus(OrderStatus.DELIVERED);
            order.setUpdatedAt(OffsetDateTime.now());
            orderRepository.save(order);
        }

        return toResponse(deliveryJobRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<DeliveryJobResponse> listOpenJobs(UUID driverCommunityId) {
        return deliveryJobRepository.findByStatusOrderByCreatedAtAsc(JobStatus.OPEN)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeliveryJobResponse> listDriverJobs(UUID driverId) {
        return deliveryJobRepository.findByDriver_IdOrderByCreatedAtDesc(driverId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateTransition(JobStatus current, JobStatus next) {
        boolean valid = switch (current) {
            case ASSIGNED -> next == JobStatus.PICKED_UP;
            case PICKED_UP -> next == JobStatus.EN_ROUTE;
            case EN_ROUTE -> next == JobStatus.DELIVERED;
            default -> false;
        };
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Invalid status transition from " + current + " to " + next);
        }
    }

    private DeliveryJobResponse toResponse(DeliveryJob job) {
        Order order = job.getOrder();
        BusinessProfile seller = order.getHustlerProfile();
        Customer customer = order.getCustomer();

        List<OrderItemResponse> items = order.getItems().stream()
                .map(i -> OrderItemResponse.builder()
                        .id(i.getId().toString())
                        .productId(i.getProduct() != null ? i.getProduct().getId().toString() : null)
                        .productName(i.getProductName())
                        .unitPrice(i.getUnitPrice())
                        .quantity(i.getQuantity())
                        .build())
                .toList();

        return DeliveryJobResponse.builder()
                .jobId(job.getId().toString())
                .orderId(order.getId().toString())
                .driverId(job.getDriver() != null ? job.getDriver().getId().toString() : null)
                .status(job.getStatus().name())
                .sellerName(seller.getBusinessName())
                .sellerAddress(seller.getOperatingArea())
                .sellerLat(seller.getLatitude())
                .sellerLng(seller.getLongitude())
                .customerName(customer.getFirstName() + " " + customer.getLastName())
                .customerPhone(maskPhone(customer.getPhone()))
                .deliveryAddress(order.getDeliveryAddress())
                .deliveryLat(order.getDeliveryLat())
                .deliveryLng(order.getDeliveryLng())
                .items(items)
                .totalAmount(order.getTotalAmount())
                .payoutAmount(job.getPayoutAmount())
                .createdAt(job.getCreatedAt().toString())
                .acceptedAt(job.getAcceptedAt() != null ? job.getAcceptedAt().toString() : null)
                .build();
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() <= 4) return phone;
        return "***" + phone.substring(phone.length() - 4);
    }
}
