package com.hustle.economy;

import com.hustle.economy.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@Transactional
@AutoConfigureMockMvc
class CommunityShopsIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;

    @Test
    void listsLiveShopsWithoutOwnerOrApplicationDetails() throws Exception {
        var community = Community.builder().name("Shops test " + UUID.randomUUID()).build();
        em.persist(community);
        var owner = AppUser.builder().phone("0700002222").email("owner@example.test").firstName("Test")
                .lastName("Owner").passwordHash("owner-hash").createdAt(OffsetDateTime.now()).build();
        em.persist(owner);
        var application = HustlerApplication.builder().firstName("Test").lastName("Owner").phone("0700002222")
                .email("owner@example.test").idNumber("0000000000000").passwordHash("application-hash")
                .businessName("Spaza One").businessType("Tuckshop").community(community).appUser(owner)
                .status(ApplicationStatus.APPROVED).submittedAt(OffsetDateTime.now()).build();
        em.persist(application);
        em.persist(BusinessProfile.builder().application(application).owner(owner).community(community)
                .businessName("Spaza One").businessType("Tuckshop").operatingArea("Near the clinic")
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build());
        em.flush();
        em.clear();

        mvc.perform(get("/api/communities/{id}/hustlers", community.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].businessName").value("Spaza One"))
                .andExpect(jsonPath("$[0].operatingArea").value("Near the clinic"))
                .andExpect(jsonPath("$[0].community.name").value(community.getName()))
                .andExpect(content().string(not(containsString("hash"))))
                .andExpect(content().string(not(containsString("0700002222"))))
                .andExpect(content().string(not(containsString("owner@example.test"))))
                .andExpect(content().string(not(containsString(application.getId().toString()))));
    }
}
