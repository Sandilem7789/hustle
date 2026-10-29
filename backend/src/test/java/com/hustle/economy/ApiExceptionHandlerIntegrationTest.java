package com.hustle.economy;

import com.hustle.economy.controller.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ApiExceptionHandlerIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ApiExceptionHandler handler;

    @Test
    void statusExceptionKeepsHttpStatusAndSafeEnvelope() throws Exception {
        mvc.perform(get("/api/operations/stats").header("X-Auth-Token", "invalid"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Invalid or expired session. Please log in again."))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void missingEntityDoesNotExposeRequestedId() throws Exception {
        String id = UUID.randomUUID().toString();
        mvc.perform(get("/api/communities/{id}/hustlers", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Resource not found"))
                .andExpect(result -> org.assertj.core.api.Assertions.assertThat(
                        result.getResponse().getContentAsString()).doesNotContain(id));
    }

    @Test
    void missingSessionHeaderIsUnauthorizedInTheSameEnvelope() throws Exception {
        mvc.perform(post("/api/communities").contentType("application/json")
                        .content("{\"name\":\"New community\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("Invalid or expired session. Please log in again."));
    }

    @Test
    void missingTokenOnAPublicEndpointIsUnauthorizedNotBadRequest() throws Exception {
        mvc.perform(post("/api/drivers/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void malformedJsonAndBadPathIdsAreBadRequests() throws Exception {
        mvc.perform(post("/api/auth/login").contentType("application/json").content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid request"));
        mvc.perform(get("/api/products/not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    @Test
    void unexpectedExceptionsHideTheirMessage() {
        var response = handler.unexpected(new RuntimeException("duplicate key value (phone)=(0700000000)"));
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).containsEntry("message", "The request could not be completed")
                .containsEntry("code", "INTERNAL_SERVER_ERROR");
        assertThat(response.getBody().toString()).doesNotContain("0700000000");
    }

    @Test
    void userFacingStateErrorsAreConflicts() {
        var response = handler.conflict(new IllegalStateException("This applicant is already active"));
        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).containsEntry("message", "This applicant is already active");
    }
}
