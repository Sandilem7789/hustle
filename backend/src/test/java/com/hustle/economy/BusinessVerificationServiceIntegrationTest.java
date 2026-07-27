package com.hustle.economy;

import com.hustle.economy.dto.BusinessVerificationRequest;
import com.hustle.economy.dto.BusinessVerificationResponse;
import com.hustle.economy.entity.Applicant;
import com.hustle.economy.entity.CallStatus;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.PipelineStage;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessVerificationRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.service.BusinessVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessVerificationServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private BusinessVerificationService verificationService;

    @Autowired
    private ApplicantRepository applicantRepository;

    @Autowired
    private BusinessVerificationRepository verificationRepository;

    @Autowired
    private CommunityRepository communityRepository;

    private Applicant applicant;

    @BeforeEach
    void setUp() {
        verificationRepository.deleteAll();
        applicantRepository.deleteAll();
        Community community = communityRepository.save(Community.builder().name("KwaJobe-" + System.nanoTime()).build());
        applicant = applicantRepository.save(Applicant.builder()
                .community(community)
                .cohortNumber(1)
                .firstName("Nomvula")
                .lastName("Dube")
                .phone("0821119999")
                .typeOfHustle("Catering")
                .pipelineStage(PipelineStage.INTERVIEWED)
                .callStatus(CallStatus.REACHED)
                .ageFlag(false)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());
    }

    @Test
    void recordVerificationReturnsPhotoUrlsWithoutLazyInitializationError() {
        BusinessVerificationRequest request = new BusinessVerificationRequest();
        request.setVisitDate(LocalDate.now());
        request.setLatitude(-27.5);
        request.setLongitude(32.2);
        request.setPhotoUrls(List.of("photo1.jpg", "photo2.jpg"));
        request.setNotes("Looks legit");
        request.setOutcome("VERIFIED");
        request.setVerifiedBy("Test Facilitator");

        BusinessVerificationResponse recorded = verificationService.recordVerification(applicant.getId(), request);
        assertThat(recorded.getPhotoUrls()).containsExactly("photo1.jpg", "photo2.jpg");

        // Simulates the real production bug: a fresh service call reloads the entity in
        // a new Hibernate session, so photoUrls comes back as an uninitialized lazy proxy.
        // Before the fix, iterating it here — exactly what Jackson does when writing the
        // HTTP response body — threw LazyInitializationException: could not initialize
        // proxy - no Session, which surfaced to the facilitator as a 500 on save.
        BusinessVerificationResponse fetched = verificationService.getByApplicant(applicant.getId());
        assertThat(fetched.getPhotoUrls()).containsExactly("photo1.jpg", "photo2.jpg");
    }

    @Test
    void recordVerificationWithNoPhotosReturnsEmptyListNotNull() {
        BusinessVerificationRequest request = new BusinessVerificationRequest();
        request.setVisitDate(LocalDate.now());
        request.setOutcome("FAILED");

        verificationService.recordVerification(applicant.getId(), request);

        BusinessVerificationResponse fetched = verificationService.getByApplicant(applicant.getId());
        assertThat(fetched.getPhotoUrls()).isNotNull().isEmpty();
    }
}
