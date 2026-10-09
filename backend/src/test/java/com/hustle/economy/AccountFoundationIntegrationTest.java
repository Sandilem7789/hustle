package com.hustle.economy;

import com.hustle.economy.entity.AppUser;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.repository.AppUserRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class AccountFoundationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Test
    void accountStoresBirthDateHomeAndAssignedCommunities() {
        Community ngwenya = communityRepository.save(Community.builder().name("Area-A-" + System.nanoTime()).build());
        Community nibela = communityRepository.save(Community.builder().name("Area-B-" + System.nanoTime()).build());

        AppUser coordinator = appUserRepository.saveAndFlush(AppUser.builder()
                .phone("0711" + (System.nanoTime() % 1_000_000))
                .firstName("Zanele")
                .lastName("Dlamini")
                .passwordHash("x")
                .createdAt(OffsetDateTime.now())
                .dateOfBirth(LocalDate.of(1998, 4, 12))
                .homeLatitude(-27.58)
                .homeLongitude(32.21)
                .assignedCommunities(Set.of(ngwenya, nibela))
                .build());

        AppUser reloaded = appUserRepository.findById(coordinator.getId()).orElseThrow();
        assertThat(reloaded.getDateOfBirth()).isEqualTo(LocalDate.of(1998, 4, 12));
        assertThat(reloaded.getHomeLatitude()).isEqualTo(-27.58);
        assertThat(reloaded.getAssignedCommunities()).extracting(Community::getName)
                .containsExactlyInAnyOrder(ngwenya.getName(), nibela.getName());
    }

    @Test
    void shopIsOwnedByAnAccountDirectly() {
        Community community = communityRepository.save(Community.builder().name("Area-C-" + System.nanoTime()).build());
        AppUser merchant = appUserRepository.saveAndFlush(AppUser.builder()
                .phone("0722" + (System.nanoTime() % 1_000_000))
                .firstName("Sipho")
                .lastName("Ntuli")
                .passwordHash("x")
                .createdAt(OffsetDateTime.now())
                .build());

        BusinessProfile shop = businessProfileRepository.saveAndFlush(BusinessProfile.builder()
                .owner(merchant)
                .community(community)
                .businessName("Sipho's Spaza")
                .businessType("Tuckshop")
                .status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now())
                .build());

        assertThat(businessProfileRepository.findById(shop.getId()).orElseThrow().getOwner().getId())
                .isEqualTo(merchant.getId());
    }
}
