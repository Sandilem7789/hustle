package com.hustle.economy;

import com.hustle.economy.entity.*;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import com.hustle.economy.repository.HustlerSessionRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// MockMvc does not apply multipart size limits, so this goes through a real HTTP server
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "upload.local-dir=${java.io.tmpdir}/hustle-upload-test")
class UploadLimitHttpIntegrationTest extends AbstractIntegrationTest {

    @Autowired TestRestTemplate rest;
    @Autowired CommunityRepository communityRepository;
    @Autowired HustlerApplicationRepository applicationRepository;
    @Autowired BusinessProfileRepository businessProfileRepository;
    @Autowired HustlerSessionRepository sessionRepository;

    private Community community;
    private HustlerApplication application;
    private BusinessProfile shop;
    private String token;
    private HustlerSession session;

    @BeforeEach
    void signedInShop() {
        community = communityRepository.save(Community.builder().name("Upload test " + UUID.randomUUID()).build());
        application = applicationRepository.save(HustlerApplication.builder().firstName("Test").lastName("Owner")
                .phone("0700003333").businessName("Upload shop").businessType("Tuckshop").community(community)
                .status(ApplicationStatus.APPROVED).role(UserRole.HUSTLER).submittedAt(OffsetDateTime.now()).build());
        shop = businessProfileRepository.save(BusinessProfile.builder().application(application).community(community)
                .businessName("Upload shop").businessType("Tuckshop").status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now()).build());
        token = UUID.randomUUID().toString().replace("-", "");
        session = sessionRepository.save(HustlerSession.builder().token(token).businessProfile(shop).createdAt(OffsetDateTime.now()).build());
    }

    @AfterEach
    void cleanUp() {
        sessionRepository.delete(session);
        businessProfileRepository.delete(shop);
        applicationRepository.delete(application);
        communityRepository.delete(community);
    }

    @Test
    void smallImageIsStored() {
        ResponseEntity<Map> response = upload(100 * 1024);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((String) response.getBody().get("url")).startsWith("/api/uploads/");
    }

    @Test
    void imageJustOverFiveMegabytesIsRefusedWithAClearMessage() {
        assertTooLarge(upload(5 * 1024 * 1024 + 512 * 1024));
    }

    @Test
    void largePhonePhotoIsRefusedWithAClearMessage() {
        assertTooLarge(upload(12 * 1024 * 1024));
    }

    private void assertTooLarge(ResponseEntity<Map> response) {
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
        assertThat(response.getBody()).containsEntry("message", "Images must be 5 MB or smaller")
                .containsEntry("code", "PAYLOAD_TOO_LARGE");
    }

    private ResponseEntity<Map> upload(int bytes) {
        var body = new LinkedMultiValueMap<String, Object>();
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.IMAGE_JPEG);
        body.add("file", new HttpEntity<>(new ByteArrayResource(new byte[bytes]) {
            @Override
            public String getFilename() {
                return "photo.jpg";
            }
        }, partHeaders));
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("X-Auth-Token", token);
        return rest.postForEntity("/api/uploads", new HttpEntity<>(body, headers), Map.class);
    }
}
