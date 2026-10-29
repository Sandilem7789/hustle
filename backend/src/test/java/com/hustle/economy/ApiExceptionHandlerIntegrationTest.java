package com.hustle.economy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ApiExceptionHandlerIntegrationTest extends AbstractIntegrationTest {

    @Autowired MockMvc mvc;

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
    void missingHeaderUsesSameEnvelope() throws Exception {
        mvc.perform(post("/api/communities").contentType("application/json")
                        .content("{\"name\":\"New community\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Invalid request"));
    }
}
