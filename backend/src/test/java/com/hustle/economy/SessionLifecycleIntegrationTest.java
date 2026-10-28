package com.hustle.economy;

import com.hustle.economy.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
@AutoConfigureMockMvc
class SessionLifecycleIntegrationTest extends AbstractIntegrationTest {

    private static final OffsetDateTime EXPIRED = OffsetDateTime.now().minusDays(31);

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;

    @Test
    void accountSessionExpiresAfterThirtyDays() throws Exception {
        AppUser owner = shopOwner();
        String fresh = appSession(owner, OffsetDateTime.now().minusDays(29));
        String old = appSession(owner, EXPIRED);

        mvc.perform(get("/api/products/my").header("X-Auth-Token", fresh)).andExpect(status().isOk());
        mvc.perform(get("/api/products/my").header("X-Auth-Token", old)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsTheAccountAndBuyerSessions() throws Exception {
        AppUser owner = shopOwner();
        String token = appSession(owner, OffsetDateTime.now());
        var customer = Customer.builder().firstName("Test").lastName("Owner").phone(owner.getPhone())
                .passwordHash("x").createdAt(OffsetDateTime.now()).build();
        em.persist(customer);
        em.persist(CustomerSession.builder().token("buyer-" + token).customer(customer).createdAt(OffsetDateTime.now()).build());
        em.flush();

        mvc.perform(post("/api/auth/logout").header("X-Auth-Token", token).header("X-Customer-Token", "buyer-" + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/products/my").header("X-Auth-Token", token)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/orders/my").header("X-Customer-Token", "buyer-" + token)).andExpect(status().isUnauthorized());
    }

    @Test
    void driverSessionExpiresAndCanBeEnded() throws Exception {
        var community = Community.builder().name("Session test " + UUID.randomUUID()).build();
        em.persist(community);
        var driver = Driver.builder().firstName("Test").lastName("Driver").phone(randomPhone()).passwordHash("x")
                .vehicleType(VehicleType.MOTORBIKE).communityBase(community).status(DriverStatus.ACTIVE)
                .createdAt(OffsetDateTime.now()).build();
        em.persist(driver);
        em.persist(DriverSession.builder().token("old-driver").driver(driver).createdAt(EXPIRED).build());
        em.persist(DriverSession.builder().token("new-driver").driver(driver).createdAt(OffsetDateTime.now()).build());
        em.flush();

        mvc.perform(get("/api/drivers/my-jobs").header("X-Driver-Token", "old-driver")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/drivers/my-jobs").header("X-Driver-Token", "new-driver")).andExpect(status().isOk());

        mvc.perform(post("/api/drivers/logout").header("X-Driver-Token", "new-driver")).andExpect(status().isNoContent());
        mvc.perform(get("/api/drivers/my-jobs").header("X-Driver-Token", "new-driver")).andExpect(status().isUnauthorized());
    }

    @Test
    void olderShopSessionExpiresAndCanBeEnded() throws Exception {
        var community = Community.builder().name("Session test " + UUID.randomUUID()).build();
        em.persist(community);
        var application = HustlerApplication.builder().firstName("Test").lastName("Owner").phone(randomPhone())
                .businessName("Test shop").businessType("Tuckshop").community(community)
                .status(ApplicationStatus.APPROVED).role(UserRole.HUSTLER).submittedAt(OffsetDateTime.now()).build();
        em.persist(application);
        var shop = BusinessProfile.builder().application(application).community(community).businessName("Test shop")
                .businessType("Tuckshop").status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        em.persist(HustlerSession.builder().token("old-shop").businessProfile(shop).createdAt(EXPIRED).build());
        em.persist(HustlerSession.builder().token("new-shop").businessProfile(shop).createdAt(OffsetDateTime.now()).build());
        em.flush();

        mvc.perform(get("/api/products/my").header("X-Auth-Token", "old-shop")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/products/my").header("X-Auth-Token", "new-shop")).andExpect(status().isOk());

        mvc.perform(post("/api/auth/logout").header("X-Auth-Token", "new-shop")).andExpect(status().isNoContent());
        mvc.perform(get("/api/products/my").header("X-Auth-Token", "new-shop")).andExpect(status().isUnauthorized());
    }

    private AppUser shopOwner() {
        var community = Community.builder().name("Session test " + UUID.randomUUID()).build();
        em.persist(community);
        var owner = AppUser.builder().phone(randomPhone()).firstName("Test").lastName("Owner").passwordHash("x")
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER, AppUserRole.HUSTLER))).build();
        em.persist(owner);
        var application = HustlerApplication.builder().firstName("Test").lastName("Owner").phone(owner.getPhone())
                .businessName("Test shop").businessType("Tuckshop").community(community).appUser(owner)
                .status(ApplicationStatus.APPROVED).submittedAt(OffsetDateTime.now()).build();
        em.persist(application);
        em.persist(BusinessProfile.builder().application(application).owner(owner).community(community)
                .businessName("Test shop").businessType("Tuckshop").status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now()).build());
        return owner;
    }

    private String appSession(AppUser user, OffsetDateTime createdAt) {
        String token = UUID.randomUUID().toString().replace("-", "");
        em.persist(AppUserSession.builder().token(token).user(user).createdAt(createdAt).build());
        em.flush();
        return token;
    }

    private static String randomPhone() {
        return "07" + (10000000 + (int) (Math.random() * 89999999));
    }
}
