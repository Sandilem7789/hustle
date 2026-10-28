package com.hustle.economy;

import com.hustle.economy.dto.DeliveryJobResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.DeliveryJobRepository;
import com.hustle.economy.repository.OrderRepository;
import com.hustle.economy.service.DispatchService;
import com.hustle.economy.service.NotificationService;
import com.hustle.economy.service.OrderService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class DispatchOrderStatusIntegrationTest extends AbstractIntegrationTest {
    @Autowired EntityManager em;
    @Autowired OrderRepository orders;
    @Autowired DeliveryJobRepository jobs;
    @Autowired DispatchService dispatch;
    @Autowired OrderService orderService;
    @Autowired NotificationService notifications;

    @Test
    void orderFollowsTheDriverFromAssignedThroughCollectedToDelivered() {
        var community = community();
        var order = confirmedDeliveryOrder(shop(community));
        var driver = driver(community);
        var job = dispatch.createJob(order);

        dispatch.acceptJob(job.getId(), driver.getId());
        assertThat(statusOf(order)).isEqualTo(OrderStatus.DRIVER_ASSIGNED);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.PICKED_UP, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.EN_ROUTE);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.EN_ROUTE, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.EN_ROUTE);

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.DELIVERED, null);
        assertThat(statusOf(order)).isEqualTo(OrderStatus.DELIVERED);
    }

    @Test
    void openJobsShowOnlyTheDriversCommunityWithoutTheBuyer() {
        var home = community();
        var elsewhere = community();
        var nearJob = dispatch.createJob(confirmedDeliveryOrder(shop(home)));
        var farJob = dispatch.createJob(confirmedDeliveryOrder(shop(elsewhere)));

        var open = dispatch.listOpenJobs(home.getId());

        assertThat(open).extracting(DeliveryJobResponse::getJobId)
                .contains(nearJob.getId().toString())
                .doesNotContain(farJob.getId().toString());
        var shown = open.stream().filter(j -> j.getJobId().equals(nearJob.getId().toString())).findFirst().orElseThrow();
        assertThat(shown.getCustomerName()).isNull();
        assertThat(shown.getCustomerPhone()).isNull();
        assertThat(shown.getDeliveryAddress()).isNull();
        assertThat(shown.getDeliveryLat()).isNull();
        assertThat(shown.getTripKm()).isNotNull();
    }

    @Test
    void driverCannotTakeAJobOutsideTheirArea() {
        var job = dispatch.createJob(confirmedDeliveryOrder(shop(community())));
        var driver = driver(community());

        assertThatThrownBy(() -> dispatch.acceptJob(job.getId(), driver.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("outside your area");
    }

    @Test
    void buyerIsShownOnlyWhileTheDriverCarriesTheParcel() {
        var community = community();
        var job = dispatch.createJob(confirmedDeliveryOrder(shop(community)));
        var driver = driver(community);

        assertThat(dispatch.acceptJob(job.getId(), driver.getId()).getCustomerName()).isNull();

        var carrying = dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.PICKED_UP, null);
        assertThat(carrying.getCustomerName()).isEqualTo("Test Buyer");
        assertThat(carrying.getCustomerPhone()).doesNotContain("*");
        assertThat(carrying.getDeliveryAddress()).isEqualTo("Blue house behind the church");

        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.EN_ROUTE, null);
        var done = dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.DELIVERED, null);
        assertThat(done.getCustomerName()).isNull();
        assertThat(done.getDeliveryAddress()).isNull();
    }

    @Test
    void cancellingBeforePickupCancelsTheDriversJobAndTellsTheShop() {
        var community = community();
        var shop = shop(community);
        var order = confirmedDeliveryOrder(shop);
        var job = dispatch.createJob(order);
        dispatch.acceptJob(job.getId(), driver(community).getId());

        assertThat(notifications.listForBusinessProfile(shop.getId()))
                .anyMatch(n -> n.getTitle().startsWith("A driver is coming"));

        orderService.updateOrderStatus(order.getId(), OrderStatus.CANCELLED, shop.getId());

        assertThat(statusOf(order)).isEqualTo(OrderStatus.CANCELLED);
        assertThat(jobs.findById(job.getId()).orElseThrow().getStatus()).isEqualTo(JobStatus.CANCELLED);
    }

    @Test
    void shopCannotCancelOnceTheDriverHasTheParcel() {
        var community = community();
        var shop = shop(community);
        var order = confirmedDeliveryOrder(shop);
        var job = dispatch.createJob(order);
        var driver = driver(community);
        dispatch.acceptJob(job.getId(), driver.getId());
        dispatch.updateJobStatus(job.getId(), driver.getId(), JobStatus.PICKED_UP, null);

        assertThatThrownBy(() -> orderService.updateOrderStatus(order.getId(), OrderStatus.CANCELLED, shop.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already collected");
    }

    @Test
    void shopCannotSetTheDriversStatuses() {
        var shop = shop(community());
        var order = confirmedDeliveryOrder(shop);

        assertThatThrownBy(() -> orderService.updateOrderStatus(order.getId(), OrderStatus.DELIVERED, shop.getId()))
                .isInstanceOf(ResponseStatusException.class);
    }

    private Community community() {
        var community = Community.builder().name("Dispatch test " + UUID.randomUUID()).build();
        em.persist(community);
        return community;
    }

    private BusinessProfile shop(Community community) {
        var shop = BusinessProfile.builder().businessName("Test shop").businessType("Product")
                .community(community).latitude(-27.0).longitude(32.0)
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        return shop;
    }

    private Driver driver(Community community) {
        var driver = Driver.builder().firstName("Test").lastName("Driver").phone(UUID.randomUUID().toString())
                .passwordHash("test-only").vehicleType(VehicleType.MOTORBIKE).communityBase(community)
                .status(DriverStatus.ACTIVE).createdAt(OffsetDateTime.now()).build();
        em.persist(driver);
        return driver;
    }

    private Order confirmedDeliveryOrder(BusinessProfile shop) {
        var customer = Customer.builder().firstName("Test").lastName("Buyer")
                .phone(UUID.randomUUID().toString()).passwordHash("test-only").createdAt(OffsetDateTime.now()).build();
        em.persist(customer);
        var order = Order.builder().customer(customer).hustlerProfile(shop)
                .transactionType(TransactionType.B2C).fulfillmentType(FulfillmentType.DELIVERY)
                .deliveryAddress("Blue house behind the church").deliveryLat(-27.05).deliveryLng(32.05)
                .status(OrderStatus.CONFIRMED).createdAt(OffsetDateTime.now())
                .totalAmount(new BigDecimal("50.00")).items(new ArrayList<>()).build();
        em.persist(order);
        return order;
    }

    private OrderStatus statusOf(Order order) {
        em.flush();
        em.clear();
        return orders.findById(order.getId()).orElseThrow().getStatus();
    }
}
