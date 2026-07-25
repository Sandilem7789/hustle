package com.hustle.economy.service;

import com.hustle.economy.entity.SurveyType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

/**
 * Notifies the n8n report-generation workflow when a facilitator clicks
 * "Generate Report" on a submitted survey assignment.
 *
 * This is a synchronous, user-initiated call (not fire-and-forget) - the facilitator
 * clicked a button and expects to know right away whether it worked, so failures are
 * surfaced back to them as a proper error rather than logged and swallowed.
 */
@Service
public class N8nWebhookService {

    private static final Logger log = LoggerFactory.getLogger(N8nWebhookService.class);

    private final RestTemplate restTemplate;

    public N8nWebhookService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Value("${n8n.webhook-url}")
    private String webhookUrl;

    @Value("${n8n.webhook-secret}")
    private String webhookSecret;

    // n8n responds synchronously to the webhook call with the generated report text.
    private record N8nReportResponse(String reportText) {
    }

    public String triggerReportGeneration(UUID assignmentId, SurveyType templateType) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Report generation isn't configured yet (missing n8n webhook URL)");
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (webhookSecret != null && !webhookSecret.isBlank()) {
                headers.set("X-Webhook-Secret", webhookSecret);
            }

            Map<String, Object> body = Map.of(
                    "assignmentId", assignmentId.toString(),
                    "templateType", templateType.name()
            );

            N8nReportResponse response = restTemplate.postForObject(webhookUrl, new HttpEntity<>(body, headers), N8nReportResponse.class);
            if (response == null || response.reportText() == null || response.reportText().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "The report-generation service returned no content.");
            }

            log.info("Generated n8n report for survey assignment {}", assignmentId);
            return response.reportText();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to generate n8n report for assignment {}: {}", assignmentId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Couldn't reach the report-generation service. Try again shortly.");
        }
    }
}
