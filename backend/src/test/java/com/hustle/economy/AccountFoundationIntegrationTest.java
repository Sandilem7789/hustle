package com.hustle.economy;

import com.hustle.economy.dto.HustlerDecisionRequest;
import com.hustle.economy.dto.UnifiedRegisterRequest;
import com.hustle.economy.entity.AppUser;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.HustlerApplication;
import com.hustle.economy.repository.AppUserRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import com.hustle.economy.service.HustlerApplicationService;
import com.hustle.economy.service.UnifiedAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class AccountFoundationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private HustlerApplicationRepository hustlerApplicationRepository;

    @Autowired
    private HustlerApplicationService hustlerApplicationService;

    @Autowired
    private UnifiedAuthService unifiedAuthService;

    @Test
    void accountStoresBirthDateHomeAndAssignedCommunities() {
        Community ngwenya = community("Area-A");
        Community nibela = community("Area-B");

        AppUser coordinator = account("0711" + unique(), null);
        coordinator.setDateOfBirth(LocalDate.of(1998, 4, 12));
        coordinator.setHomeLatitude(-27.58);
        coordinator.setHomeLongitude(32.21);
        coordinator.setAssignedCommunities(Set.of(ngwenya, nibela));
        coordinator = appUserRepository.saveAndFlush(coordinator);

        AppUser reloaded = appUserRepository.findById(coordinator.getId()).orElseThrow();
        assertThat(reloaded.getDateOfBirth()).isEqualTo(LocalDate.of(1998, 4, 12));
        assertThat(reloaded.getHomeLatitude()).isEqualTo(-27.58);
        assertThat(reloaded.getAssignedCommunities()).extracting(Community::getName)
                .containsExactlyInAnyOrder(ngwenya.getName(), nibela.getName());
    }

    @Test
    void shopIsOwnedByAnAccountDirectly() {
        AppUser merchant = appUserRepository.saveAndFlush(account("0722" + unique(), null));
        BusinessProfile saved = businessProfileRepository.saveAndFlush(shop(merchant, community("Area-C"), "Sipho's Spaza"));

        assertThat(businessProfileRepository.findById(saved.getId()).orElseThrow().getOwner().getId())
                .isEqualTo(merchant.getId());
    }

    @Test
    void signUpWithAnEmailAlreadyInUseIsRefusedWhateverTheCase() {
        appUserRepository.saveAndFlush(account("0733" + unique(), "thandi@example.com"));

        UnifiedRegisterRequest request = new UnifiedRegisterRequest();
        request.setFirstName("Other");
        request.setLastName("Person");
        request.setPhone("0744" + unique());
        request.setPassword("secret123");
        request.setEmail("  Thandi@Example.com ");

        assertThatThrownBy(() -> unifiedAuthService.register(request))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void approvingASecondShopForTheSameAccountIsRefused() {
        Community community = community("Area-D");
        AppUser owner = appUserRepository.saveAndFlush(account("0755" + unique(), null));
        businessProfileRepository.saveAndFlush(shop(owner, community, "First Shop"));

        HustlerApplication second = hustlerApplicationRepository.saveAndFlush(HustlerApplication.builder()
                .firstName("Sipho").lastName("Ntuli").phone(owner.getPhone())
                .businessName("Second Shop").businessType("Tuckshop")
                .community(community).appUser(owner)
                .status(ApplicationStatus.PENDING).submittedAt(OffsetDateTime.now())
                .build());

        HustlerDecisionRequest approve = new HustlerDecisionRequest();
        approve.setStatus("APPROVED");

        assertThatThrownBy(() -> hustlerApplicationService.decide(second.getId(), approve))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void theDatabaseRejectsASecondShopForTheSameOwner() {
        Community community = community("Area-E");
        AppUser owner = appUserRepository.saveAndFlush(account("0766" + unique(), null));
        businessProfileRepository.saveAndFlush(shop(owner, community, "First Shop"));

        assertThatThrownBy(() -> businessProfileRepository.saveAndFlush(shop(owner, community, "Second Shop")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsTheSameEmailOnTwoAccountsWhateverTheCase() {
        appUserRepository.saveAndFlush(account("0777" + unique(), "lindiwe@example.com"));

        assertThatThrownBy(() -> appUserRepository.saveAndFlush(account("0788" + unique(), "LINDIWE@example.com")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Community community(String prefix) {
        return communityRepository.save(Community.builder().name(prefix + "-" + System.nanoTime()).build());
    }

    private static String unique() {
        return String.valueOf(System.nanoTime() % 1_000_000);
    }

    private static AppUser account(String phone, String email) {
        return AppUser.builder()
                .phone(phone).email(email).firstName("Test").lastName("Account")
                .passwordHash("x").createdAt(OffsetDateTime.now())
                .build();
    }

    private static BusinessProfile shop(AppUser owner, Community community, String name) {
        return BusinessProfile.builder()
                .owner(owner).community(community)
                .businessName(name).businessType("Tuckshop")
                .status(ApplicationStatus.APPROVED).createdAt(OffsetDateTime.now())
                .build();
    }
}
