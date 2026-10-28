package com.hustle.economy;

import com.hustle.economy.entity.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpMethod;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Transactional
@AutoConfigureMockMvc
class SecurityIntegrationTest extends AbstractIntegrationTest {

    // The only endpoints reachable without a session. Adding a public endpoint means adding it
    // here and to SecurityConfig; every other endpoint must refuse an anonymous request.
    private static final Set<String> PUBLIC = Set.of(
            "POST /api/auth/login", "POST /api/auth/register",
            "POST /api/customers/login", "POST /api/customers/register",
            "POST /api/drivers/login", "POST /api/drivers/register",
            "POST /api/orders/validate-distance",
            "POST /api/hustlers",
            "GET /api/communities", "GET /api/communities/{id}/hustlers",
            "GET /api/uploads/{filename:.+}",
            "GET /api/products", "GET /api/products/{id}");

    @Autowired MockMvc mvc;
    @Autowired EntityManager em;
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping mappings;

    @Test
    void everyEndpointOutsideThePublicListRefusesAnonymousRequests() throws Exception {
        List<String> open = new ArrayList<>();
        int checked = 0;
        for (var info : mappings.getHandlerMethods().keySet()) {
            for (String pattern : info.getPatternValues()) {
                for (RequestMethod method : info.getMethodsCondition().getMethods()) {
                    String endpoint = method + " " + pattern;
                    if (PUBLIC.contains(endpoint)) continue;
                    String url = pattern.replaceAll("\\{[^}]+}", UUID.randomUUID().toString());
                    int status = mvc.perform(request(HttpMethod.valueOf(method.name()), url))
                            .andReturn().getResponse().getStatus();
                    if (status != 401) open.add(endpoint + " -> " + status);
                    checked++;
                }
            }
        }
        assertThat(open).isEmpty();
        assertThat(checked).isGreaterThan(60);
    }

    @Test
    void corsPreflightFromTheProductionSiteIsAllowedWithoutASession() throws Exception {
        mvc.perform(options("/api/products/my")
                        .header("Origin", "https://hustleconomy.netlify.app")
                        .header("Access-Control-Request-Method", "PATCH")
                        .header("Access-Control-Request-Headers", "X-Auth-Token"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://hustleconomy.netlify.app"));
    }

    @Test
    void unknownTokenIsTreatedAsAnonymous() throws Exception {
        mvc.perform(get("/api/products").header("X-Auth-Token", "not-a-session"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/products/my").header("X-Auth-Token", "not-a-session"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shopAccountCannotReachStaffEndpoints() throws Exception {
        String token = legacySession(UserRole.HUSTLER);
        mvc.perform(get("/api/survey-templates").header("X-Auth-Token", token))
                .andExpect(status().isForbidden())
                .andExpect(status().reason("Access denied"));
        mvc.perform(get("/api/products/my").header("X-Auth-Token", token))
                .andExpect(status().isOk());
    }

    @Test
    void staffAccountReachesStaffEndpoints() throws Exception {
        mvc.perform(get("/api/survey-templates").header("X-Auth-Token", legacySession(UserRole.COORDINATOR)))
                .andExpect(status().isOk());
    }

    @Test
    void buyerTokenCannotReachShopOrStaffEndpoints() throws Exception {
        var customer = Customer.builder().firstName("Test").lastName("Buyer").phone("0700001111")
                .passwordHash("x").createdAt(OffsetDateTime.now()).build();
        em.persist(customer);
        em.persist(CustomerSession.builder().token("buyer-token").customer(customer)
                .createdAt(OffsetDateTime.now()).build());

        mvc.perform(get("/api/orders/my").header("X-Customer-Token", "buyer-token"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/orders/incoming").header("X-Customer-Token", "buyer-token"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/applicants").header("X-Customer-Token", "buyer-token"))
                .andExpect(status().isForbidden());
    }

    private String legacySession(UserRole role) {
        var community = Community.builder().name("Security test " + UUID.randomUUID()).build();
        em.persist(community);
        var application = HustlerApplication.builder().firstName("Test").lastName("Person")
                .phone("07" + (10000000 + (int) (Math.random() * 89999999)))
                .businessName("Test shop").businessType("Tuckshop").community(community)
                .status(ApplicationStatus.APPROVED).role(role).submittedAt(OffsetDateTime.now()).build();
        em.persist(application);
        var shop = BusinessProfile.builder().application(application).community(community)
                .businessName("Test shop").businessType("Tuckshop")
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now()).build();
        em.persist(shop);
        String token = UUID.randomUUID().toString().replace("-", "");
        em.persist(HustlerSession.builder().token(token).businessProfile(shop).createdAt(OffsetDateTime.now()).build());
        em.flush();
        return token;
    }
}
