package com.hustle.economy.service;

import com.hustle.economy.dto.DeliveryJobResponse;
import com.hustle.economy.dto.OrderItemResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.DeliveryJobRepository;
import com.hustle.economy.repository.DriverRepository;
import com.hustle.economy.repository.OrderRepository;
import com.hustle.economy.util.HaversineUtil;
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
    private final NotificationService notificationService;

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

        if (!job.getOrder().getHustlerProfile().getCommunity().getId().equals(driver.getCommunityBase().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This job is outside your area");
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
        setOrderStatus(order, OrderStatus.DRIVER_ASSIGNED);
        notificationService.create(order.getHustlerProfile(), NotificationType.ORDER,
                "A driver is coming for order #" + OrderService.shortRef(order),
                driver.getFirstName() + " will collect it from your shop.",
                "/dashboard?tab=orders");

        return toResponse(deliveryJobRepository.save(job));
    }

    @Transactional
    public void cancelJobForOrder(Order order) {
        deliveryJobRepository.findByOrder_Id(order.getId()).ifPresent(job -> {
            if (job.getStatus() != JobStatus.OPEN && job.getStatus() != JobStatus.ASSIGNED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "The driver has already collected this order");
            }
            job.setStatus(JobStatus.CANCELLED);
            deliveryJobRepository.save(job);
        });
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

        if (newStatus == JobStatus.PICKED_UP || newStatus == JobStatus.EN_ROUTE) {
            setOrderStatus(job.getOrder(), OrderStatus.EN_ROUTE);
        }

        if (newStatus == JobStatus.DELIVERED) {
            job.setDeliveredAt(OffsetDateTime.now());
            if (proofPhotoUrl != null) {
                job.setProofPhotoUrl(proofPhotoUrl);
            }
            setOrderStatus(job.getOrder(), OrderStatus.DELIVERED);
        }

        return toResponse(deliveryJobRepository.save(job));
    }

    @Transactional(readOnly = true)
    public List<DeliveryJobResponse> listOpenJobs(UUID driverCommunityId) {
        return deliveryJobRepository.findByStatusAndOrder_HustlerProfile_Community_IdOrderByCreatedAtAsc(JobStatus.OPEN, driverCommunityId)
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

    private void setOrderStatus(Order order, OrderStatus status) {
        order.setStatus(status);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);
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

        // Need to know (D10): the buyer and drop-off are shown only while the driver is carrying the parcel
        boolean carrying = job.getStatus() == JobStatus.PICKED_UP || job.getStatus() == JobStatus.EN_ROUTE;
        Double tripKm = seller.getLatitude() != null && seller.getLongitude() != null
                && order.getDeliveryLat() != null && order.getDeliveryLng() != null
                ? HaversineUtil.distanceKm(seller.getLatitude(), seller.getLongitude(), order.getDeliveryLat(), order.getDeliveryLng())
                : null;

        return DeliveryJobResponse.builder()
                .jobId(job.getId().toString())
                .orderId(order.getId().toString())
                .driverId(job.getDriver() != null ? job.getDriver().getId().toString() : null)
                .status(job.getStatus().name())
                .sellerName(seller.getBusinessName())
                .sellerAddress(seller.getOperatingArea())
                .sellerLat(seller.getLatitude())
                .sellerLng(seller.getLongitude())
                .customerName(carrying ? customer.getFirstName() + " " + customer.getLastName() : null)
                .customerPhone(carrying ? customer.getPhone() : null)
                .deliveryAddress(carrying ? order.getDeliveryAddress() : null)
                .deliveryLat(carrying ? order.getDeliveryLat() : null)
                .deliveryLng(carrying ? order.getDeliveryLng() : null)
                .tripKm(tripKm)
                .items(items)
                .totalAmount(order.getTotalAmount())
                .payoutAmount(job.getPayoutAmount())
                .createdAt(job.getCreatedAt().toString())
                .acceptedAt(job.getAcceptedAt() != null ? job.getAcceptedAt().toString() : null)
                .build();
    }
}
