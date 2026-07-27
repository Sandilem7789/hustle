package com.hustle.economy;

import com.hustle.economy.dto.ActivateApplicantResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.*;
import com.hustle.economy.service.ApplicantService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ApplicantServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private ApplicantService applicantService;

    @Autowired
    private ApplicantRepository applicantRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private HustlerApplicationRepository hustlerApplicationRepository;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private Community community;

    @BeforeEach
    void cleanDatabase() {
        businessProfileRepository.deleteAll();
        hustlerApplicationRepository.deleteAll();
        appUserRepository.deleteAll();
        applicantRepository.deleteAll();
        community = communityRepository.save(Community.builder().name("KwaNgwenya-" + System.nanoTime()).build());
    }

    private Applicant approvedApplicant(String phone) {
        return applicantRepository.save(Applicant.builder()
                .community(community)
                .cohortNumber(1)
                .firstName("Thandi")
                .lastName("Mkhize")
                .phone(phone)
                .typeOfHustle("Sewing")
                .pipelineStage(PipelineStage.APPROVED)
                .callStatus(CallStatus.REACHED)
                .ageFlag(false)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build());
    }

    @Test
    void activatePaperApplicantGeneratesPasswordAndCreatesApplication() {
        Applicant applicant = approvedApplicant("0821112222");

        ActivateApplicantResponse response = applicantService.activate(applicant.getId());

        assertThat(response.getCredentialsMode()).isEqualTo("GENERATED");
        assertThat(response.getGeneratedPassword()).isNotBlank();

        HustlerApplication application = hustlerApplicationRepository.findById(response.getApplicationId()).orElseThrow();
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(application.getAppUser()).isNull();
        assertThat(passwordEncoder.matches(response.getGeneratedPassword(), application.getPasswordHash())).isTrue();

        assertThat(businessProfileRepository.findByApplication_Id(application.getId())).isPresent();
        assertThat(applicantRepository.findById(applicant.getId()).orElseThrow().getActivatedAt()).isNotNull();
    }

    @Test
    void activateDoesNotDuplicateExistingHustlerApplicationForPaperApplicant() {
        Applicant applicant = approvedApplicant("0821113333");

        HustlerApplication preExisting = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Thandi")
                .lastName("Mkhize")
                .phone("0821113333")
                .businessName("Old Name")
                .businessType("Sewing")
                .description("")
                .status(ApplicationStatus.PENDING)
                .passwordHash(passwordEncoder.encode("oldpassword"))
                .submittedAt(OffsetDateTime.now())
                .build());

        ActivateApplicantResponse response = applicantService.activate(applicant.getId());

        assertThat(response.getApplicationId()).isEqualTo(preExisting.getId());
        assertThat(hustlerApplicationRepository.count()).isEqualTo(1);

        HustlerApplication reloaded = hustlerApplicationRepository.findById(preExisting.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(passwordEncoder.matches(response.getGeneratedPassword(), reloaded.getPasswordHash())).isTrue();
    }

    @Test
    void activateForExistingAppUserDoesNotGeneratePasswordAndLinksAccount() {
        String phone = "0821114444";
        AppUser appUser = appUserRepository.save(AppUser.builder()
                .phone(phone)
                .firstName("Thandi")
                .lastName("Mkhize")
                .passwordHash(passwordEncoder.encode("mySelfChosenPassword"))
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER)))
                .build());

        Applicant applicant = approvedApplicant(phone);

        ActivateApplicantResponse response = applicantService.activate(applicant.getId());

        assertThat(response.getCredentialsMode()).isEqualTo("EXISTING_ACCOUNT");
        assertThat(response.getGeneratedPassword()).isNull();

        AppUser reloadedUser = appUserRepository.findById(appUser.getId()).orElseThrow();
        assertThat(reloadedUser.getRoles()).contains(AppUserRole.HUSTLER);
        // Original self-chosen password must be untouched
        assertThat(passwordEncoder.matches("mySelfChosenPassword", reloadedUser.getPasswordHash())).isTrue();

        HustlerApplication application = hustlerApplicationRepository.findById(response.getApplicationId()).orElseThrow();
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(application.getAppUser().getId()).isEqualTo(appUser.getId());
        assertThat(businessProfileRepository.findByApplication_Id(application.getId())).isPresent();
    }

    @Test
    void activateApprovesExistingPendingApplicationInsteadOfCreatingDuplicate() {
        String phone = "0821115555";
        AppUser appUser = appUserRepository.save(AppUser.builder()
                .phone(phone)
                .firstName("Thandi")
                .lastName("Mkhize")
                .passwordHash(passwordEncoder.encode("mySelfChosenPassword"))
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER)))
                .build());

        HustlerApplication pending = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Thandi")
                .lastName("Mkhize")
                .phone(phone)
                .businessName("Thandi's Sewing")
                .businessType("Sewing")
                .description("")
                .status(ApplicationStatus.PENDING)
                .passwordHash(appUser.getPasswordHash())
                .appUser(appUser)
                .submittedAt(OffsetDateTime.now())
                .build());

        Applicant applicant = approvedApplicant(phone);

        ActivateApplicantResponse response = applicantService.activate(applicant.getId());

        assertThat(response.getCredentialsMode()).isEqualTo("EXISTING_ACCOUNT");
        assertThat(response.getApplicationId()).isEqualTo(pending.getId());
        assertThat(hustlerApplicationRepository.count()).isEqualTo(1);

        HustlerApplication reloaded = hustlerApplicationRepository.findById(pending.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(ApplicationStatus.APPROVED);

        AppUser reloadedUser = appUserRepository.findById(appUser.getId()).orElseThrow();
        assertThat(reloadedUser.getRoles()).contains(AppUserRole.HUSTLER);
    }

    @Test
    void resetPasswordUpdatesAppUserHashWhenAppUserExists() {
        String phone = "0821116666";
        AppUser appUser = appUserRepository.save(AppUser.builder()
                .phone(phone)
                .firstName("Thandi")
                .lastName("Mkhize")
                .passwordHash(passwordEncoder.encode("originalPassword"))
                .createdAt(OffsetDateTime.now())
                .roles(new HashSet<>(Set.of(AppUserRole.CUSTOMER, AppUserRole.HUSTLER)))
                .build());

        HustlerApplication application = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Thandi")
                .lastName("Mkhize")
                .phone(phone)
                .businessName("Thandi's Sewing")
                .businessType("Sewing")
                .description("")
                .status(ApplicationStatus.APPROVED)
                .passwordHash(appUser.getPasswordHash())
                .appUser(appUser)
                .submittedAt(OffsetDateTime.now())
                .decidedAt(OffsetDateTime.now())
                .build());

        Applicant applicant = approvedApplicant(phone);
        applicant.setActivatedAt(OffsetDateTime.now());
        applicantRepository.save(applicant);

        ActivateApplicantResponse response = applicantService.resetPassword(applicant.getId());

        AppUser reloadedUser = appUserRepository.findById(appUser.getId()).orElseThrow();
        assertThat(passwordEncoder.matches(response.getGeneratedPassword(), reloadedUser.getPasswordHash())).isTrue();

        HustlerApplication reloadedApplication = hustlerApplicationRepository.findById(application.getId()).orElseThrow();
        assertThat(passwordEncoder.matches(response.getGeneratedPassword(), reloadedApplication.getPasswordHash())).isTrue();
    }

    @Test
    void resetPasswordFallsBackToHustlerApplicationWhenNoAppUserExists() {
        String phone = "0821117777";

        HustlerApplication application = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Thandi")
                .lastName("Mkhize")
                .phone(phone)
                .businessName("Thandi's Sewing")
                .businessType("Sewing")
                .description("")
                .status(ApplicationStatus.APPROVED)
                .passwordHash(passwordEncoder.encode("originalPassword"))
                .submittedAt(OffsetDateTime.now())
                .decidedAt(OffsetDateTime.now())
                .build());

        Applicant applicant = approvedApplicant(phone);
        applicant.setActivatedAt(OffsetDateTime.now());
        applicantRepository.save(applicant);

        ActivateApplicantResponse response = applicantService.resetPassword(applicant.getId());

        assertThat(appUserRepository.findByPhone(phone)).isEmpty();
        HustlerApplication reloadedApplication = hustlerApplicationRepository.findById(application.getId()).orElseThrow();
        assertThat(passwordEncoder.matches(response.getGeneratedPassword(), reloadedApplication.getPasswordHash())).isTrue();
    }

    @Test
    void listAndCapStatusStillWork() {
        Applicant applicant = approvedApplicant("0821118888");
        List<com.hustle.economy.dto.ApplicantResponse> results = applicantService.list(community.getId().toString(), null, null);
        assertThat(results).extracting("id").contains(applicant.getId());
    }
}
