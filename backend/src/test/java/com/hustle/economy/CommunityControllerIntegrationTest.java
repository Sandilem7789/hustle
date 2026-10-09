package com.hustle.economy;

import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class CommunityControllerIntegrationTest extends AbstractIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired CommunityRepository communities;
    @Autowired BusinessProfileRepository shops;

    @Test
    void communityHustlersSerializeOutsideTheDatabaseTransactionWithoutPrivateRelations() throws Exception {
        var community = communities.saveAndFlush(Community.builder()
                .name("DTO test " + UUID.randomUUID()).region("KZN").build());
        var shop = shops.saveAndFlush(BusinessProfile.builder()
                .businessName("Public shop").businessType("Products").description("Local goods")
                .operatingArea("KwaNgwenya").community(community)
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build());
        try {
            var result = mvc.perform(get("/api/communities/{id}/hustlers", community.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].id").value(shop.getId().toString()))
                    .andExpect(jsonPath("$[0].community.name").value(community.getName()))
                    .andReturn();
            String body = result.getResponse().getContentAsString();
            assertThat(body).doesNotContain("owner", "application", "passwordHash", "products");
        } finally {
            shops.deleteById(shop.getId());
            communities.deleteById(community.getId());
        }
    }
}
