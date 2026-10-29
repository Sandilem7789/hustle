package com.hustle.economy;

import com.hustle.economy.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
@AutoConfigureMockMvc
class PaginationIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;

    private Community community;

    @BeforeEach
    void threeProducts() {
        community = Community.builder().name("Paging test " + UUID.randomUUID()).build();
        em.persist(community);
        var shop = BusinessProfile.builder().businessName("Paging shop").businessType("Tuckshop").community(community)
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        for (String name : new String[]{"Bread", "Milk", "Eggs"}) {
            em.persist(Product.builder().business(shop).name(name).description(name).category(ProductCategory.GROCERY)
                    .price(BigDecimal.TEN).createdAt(OffsetDateTime.now()).updatedAt(OffsetDateTime.now()).build());
        }
        em.flush();
    }

    @Test
    void withoutPageParamsTheFullListIsReturnedAsBefore() throws Exception {
        mvc.perform(get("/api/products").param("communityId", community.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(3)));
    }

    @Test
    void withPageParamsOnePageIsReturnedWithTotals() throws Exception {
        mvc.perform(get("/api/products").param("communityId", community.getId().toString()).param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/products").param("communityId", community.getId().toString())
                        .param("page", "1").param("size", "2"))
                .andExpect(jsonPath("$.content", hasSize(1)));
        mvc.perform(get("/api/products").param("communityId", community.getId().toString()).param("page", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)))
                .andExpect(jsonPath("$.size").value(20));
    }

    @Test
    void pageSizesOutsideTheLimitsAreRefused() throws Exception {
        mvc.perform(get("/api/products").param("size", "500"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        mvc.perform(get("/api/products").param("page", "-1"))
                .andExpect(status().isBadRequest());
    }
}
