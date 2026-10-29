package com.hustle.economy;

import com.hustle.economy.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
@AutoConfigureMockMvc
class ProductDetailIntegrationTest extends AbstractIntegrationTest {
    @Autowired EntityManager em;
    @Autowired MockMvc mvc;

    @Test
    void returnsProductWithSellerWithoutAuthentication() throws Exception {
        var community = Community.builder().name("Product test " + UUID.randomUUID()).build();
        em.persist(community);
        var shop = BusinessProfile.builder().businessName("Mama's Kitchen").businessType("Product")
                .community(community).status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        var product = Product.builder().business(shop).name("Vetkoek").description("Fresh daily")
                .category(ProductCategory.FAST_FOOD).price(new BigDecimal("12.50"))
                .createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now()).build();
        em.persist(product);
        em.flush();
        em.clear();

        mvc.perform(get("/api/products/{id}", product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(product.getId().toString()))
                .andExpect(jsonPath("$.name").value("Vetkoek"))
                .andExpect(jsonPath("$.description").value("Fresh daily"))
                .andExpect(jsonPath("$.price").value(12.50))
                .andExpect(jsonPath("$.category").value("FAST_FOOD"))
                .andExpect(jsonPath("$.businessId").value(shop.getId().toString()))
                .andExpect(jsonPath("$.businessName").value("Mama's Kitchen"));
    }

    @Test
    void missingProductReturnsNotFoundWithoutLeakingItsId() throws Exception {
        var missing = UUID.randomUUID();
        mvc.perform(get("/api/products/{id}", missing))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found"))
                .andExpect(content().string(not(containsString(missing.toString()))));
    }
}
