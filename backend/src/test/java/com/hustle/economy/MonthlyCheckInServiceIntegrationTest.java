package com.hustle.economy;

import com.hustle.economy.dto.MonthlyCheckInRequest;
import com.hustle.economy.dto.MonthlyCheckInResponse;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.MonthlyCheckInRepository;
import com.hustle.economy.service.MonthlyCheckInService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MonthlyCheckInServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MonthlyCheckInService checkInService;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private MonthlyCheckInRepository checkInRepository;

    private BusinessProfile profile;

    @BeforeEach
    void setUp() {
        checkInRepository.deleteAll();
        businessProfileRepository.deleteAll();
        Community community = communityRepository.save(Community.builder().name("KwaMnqobokazi-" + System.nanoTime()).build());
        profile = businessProfileRepository.save(BusinessProfile.builder()
                .community(community)
                .businessName("Nomvula Catering")
                .businessType("Catering")
                .status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now())
                .active(true)
                .build());
    }

    @Test
    void recordAndListReturnPhotoUrlsWithoutLazyInitializationError() {
        MonthlyCheckInRequest request = new MonthlyCheckInRequest();
        request.setNotes("All good");
        request.setPhotoUrls(List.of("visit1.jpg", "visit2.jpg"));
        request.setVisitedBy("Test Facilitator");

        checkInService.record(profile.getId(), request);

        // Fresh call = fresh Hibernate session, exercising the same lazy-collection path
        // Jackson hits when serializing the HTTP response.
        List<MonthlyCheckInResponse> list = checkInService.list(profile.getId());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getPhotoUrls()).containsExactly("visit1.jpg", "visit2.jpg");
    }
}
