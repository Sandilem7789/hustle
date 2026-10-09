package com.hustle.economy;

import com.hustle.economy.dto.OrderItemRequest;
import com.hustle.economy.dto.OrderRequest;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.*;
import com.hustle.economy.service.OrderService;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;

@Transactional
class OrderQueryIntegrationTest extends AbstractIntegrationTest {
    @Autowired EntityManager em;
    @Autowired OrderRepository orders;
    @Autowired OrderService service;

    @Test
    void listsFetchCompleteResponsesInOneQueryWithoutDuplicatesOrOtherOwners() {
        var customer = customer();
        var other = customer();
        var shop = shop();
        var anotherShop = shop();
        for (int i = 0; i < 4; i++) order(customer, shop, i);
        order(other, anotherShop, 5);
        em.flush();
        em.clear();
        var statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        try {
            statistics.clear();
            var mine = service.listOrdersByCustomer(customer.getId());
            assertThat(mine).hasSize(4);
            assertThat(mine).allSatisfy(o -> {
                assertThat(o.getCustomerName()).isEqualTo("Test Buyer");
                assertThat(o.getHustlerName()).isEqualTo("Test shop");
                assertThat(o.getItems()).hasSize(2);
                assertThat(o.getPickupToken()).isNotNull();
            });
            assertThat(mine.get(0).getCreatedAt()).isGreaterThan(mine.get(3).getCreatedAt());
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
            em.clear();
            statistics.clear();
            var incoming = service.listOrdersByHustler(shop.getId());
            assertThat(incoming).hasSize(4).allSatisfy(o -> {
                assertThat(o.getItems()).hasSize(2);
                assertThat(o.getPickupToken()).isNull();
            });
            assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        } finally {
            statistics.setStatisticsEnabled(false);
        }
    }

    @Test
    void missingProductReturnsNotFoundWithoutLeakingItsId() {
        var customer = customer();
        var missing = UUID.randomUUID();
        var request = OrderRequest.builder().items(List.of(OrderItemRequest.builder()
                .productId(missing).quantity(1).build())).build();
        assertThatThrownBy(() -> service.createOrder(request, customer.getId()))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(ex.getReason()).isEqualTo("Product not found").doesNotContain(missing.toString());
                });
    }

    @Test
    void distantFoodDeliveryReturnsBadRequestBeforeSavingOrder() {
        var customer = customer();
        var shop = shop();
        var product = Product.builder().business(shop).name("Meal").category(ProductCategory.FAST_FOOD)
                .price(BigDecimal.TEN).createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now()).build();
        em.persist(product);
        var request = OrderRequest.builder().items(List.of(OrderItemRequest.builder()
                .productId(product.getId()).quantity(1).build()))
                .fulfillmentType(FulfillmentType.DELIVERY).deliveryLat(-30.0).deliveryLng(31.0).build();
        long before = orders.count();
        assertThatThrownBy(() -> service.createOrder(request, customer.getId()))
                .isInstanceOfSatisfying(ResponseStatusException.class, ex -> {
                    assertThat(ex.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(ex.getReason()).contains("collect in person");
                });
        assertThat(orders.count()).isEqualTo(before);
    }

    private Customer customer() {
        var customer = Customer.builder().firstName("Test").lastName("Buyer")
                .phone(UUID.randomUUID().toString()).passwordHash("test-only").createdAt(OffsetDateTime.now()).build();
        em.persist(customer);
        return customer;
    }

    private BusinessProfile shop() {
        var community = Community.builder().name("Order test " + UUID.randomUUID()).build();
        em.persist(community);
        var shop = BusinessProfile.builder().businessName("Test shop").businessType("Product")
                .community(community).latitude(-27.0).longitude(32.0)
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        return shop;
    }

    private void order(Customer customer, BusinessProfile shop, int day) {
        var order = Order.builder().customer(customer).hustlerProfile(shop)
                .transactionType(TransactionType.B2C).fulfillmentType(FulfillmentType.COLLECTION)
                .createdAt(OffsetDateTime.now().plusDays(day)).pickupToken(UUID.randomUUID().toString())
                .totalAmount(new BigDecimal("20.00")).items(new ArrayList<>()).build();
        // One item still links to its product (reading its id must not cost a query);
        // the other outlived its product, and both rows must survive the fetch.
        var product = Product.builder().business(shop).name("Bread").category(ProductCategory.GROCERY)
                .price(BigDecimal.TEN).createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now()).build();
        em.persist(product);
        order.getItems().add(OrderItem.builder().order(order).product(product)
                .productName("Bread").unitPrice(BigDecimal.TEN).quantity(1).build());
        order.getItems().add(OrderItem.builder().order(order)
                .productName("Historical item").unitPrice(BigDecimal.TEN).quantity(1).build());
        em.persist(order);
    }
}
