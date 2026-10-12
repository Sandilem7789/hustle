package com.hustle.economy;

import com.hustle.economy.entity.*;
import com.hustle.economy.repository.OrderRepository;
import com.hustle.economy.service.DispatchService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class DispatchOrderStatusIntegrationTest extends AbstractIntegrationTest {
    @Autowired EntityManager em;
    @Autowired OrderRepository orders;
    @Autowired DispatchService dispatch;

    @Test
    void orderFollowsTheDriverFromAssignedThroughOnTheWayToDelivered() {
        var community = Community.builder().name("Dispatch test " + UUID.randomUUID()).build();
        em.persist(community);
        var customer = Customer.builder().firstName("Test").lastName("Buyer")
                .phone(UUID.randomUUID().toString()).passwordHash("test-only").createdAt(OffsetDateTime.now()).build();
        em.persist(customer);
        var shop = BusinessProfile.builder().businessName("Test shop").businessType("Product")
                .community(community).latitude(-27.0).longitude(32.0)
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        var driver = Driver.builder().firstName("Test").lastName("Driver").phone(UUID.randomUUID().toString())
                .passwordHash("test-only").vehicleType(VehicleType.MOTORBIKE).communityBase(community)
                .status(DriverStatus.ACTIVE).createdAt(OffsetDateTime.now()).build();
        em.persist(driver);
        var order = Order.builder().customer(customer).hustlerProfile(shop)
                .transactionType(TransactionType.B2C).fulfillmentType(FulfillmentType.DELIVERY)
                .status(OrderStatus.CONFIRMED).createdAt(OffsetDateTime.now())
                .totalAmount(new BigDecimal("50.00")).items(new ArrayList<>()).build();
        em.persist(order);
        var job = dispatch.createJob(order);

        dispatch.acceptJob(job.getId(), driver.getId());
        assertThat(statusOf(order)).isEqualTo(OrderStatus.DRIVER_ASSIGNED);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.PICKED_UP, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.DRIVER_ASSIGNED);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.EN_ROUTE, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.EN_ROUTE);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.DELIVERED, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.DELIVERED);
    }

    private OrderStatus statusOf(Order order) {
        em.flush();
        em.clear();
        return orders.findById(order.getId()).orElseThrow().getStatus();
    }
}
