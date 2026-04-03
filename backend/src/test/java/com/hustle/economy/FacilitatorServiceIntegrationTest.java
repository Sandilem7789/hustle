package com.hustle.economy;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.HustlerApplication;
import com.hustle.economy.entity.IncomeEntry;
import com.hustle.economy.entity.EntryType;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import com.hustle.economy.repository.IncomeEntryRepository;
import com.hustle.economy.service.FacilitatorService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class FacilitatorServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private FacilitatorService facilitatorService;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @Autowired
    private HustlerApplicationRepository hustlerApplicationRepository;

    @Autowired
    private IncomeEntryRepository incomeEntryRepository;

    @BeforeEach
    void cleanDatabase() {
        incomeEntryRepository.deleteAll();
        businessProfileRepository.deleteAll();
        hustlerApplicationRepository.deleteAll();
    }

    @Test
    void listActiveHustlersScopesIncomeByCommunity() {
        LocalDate today = LocalDate.now();
        Community north = communityRepository.save(Community.builder().name("North Hub").region("North").build());
        Community south = communityRepository.save(Community.builder().name("South Hub").region("South").build());

        HustlerApplication appA = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Ama")
                .lastName("Zulu")
                .phone("0821230000")
                .businessName("Ama Crafts")
                .businessType("Product")
                .community(north)
                .status(ApplicationStatus.APPROVED)
                .description("Handmade goods")
                .targetCustomers("Tourists")
                .vision("Scale to Durban")
                .mission("Empower artisans")
                .submittedAt(OffsetDateTime.now())
                .build());

        BusinessProfile profileA = businessProfileRepository.save(BusinessProfile.builder()
                .application(appA)
                .community(north)
                .businessName("Ama Crafts")
                .businessType("Product")
                .description("Handmade goods")
                .targetCustomers("Tourists")
                .vision("Scale to Durban")
                .mission("Empower artisans")
                .operatingArea("North")
                .status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now())
                .active(true)
                .build());

        HustlerApplication appB = hustlerApplicationRepository.save(HustlerApplication.builder()
                .firstName("Lebo")
                .lastName("Maseko")
                .phone("0821231111")
                .businessName("Lebo Fresh")
                .businessType("Service")
                .community(south)
                .status(ApplicationStatus.APPROVED)
                .description("Fresh produce")
                .targetCustomers("Locals")
                .vision("Healthy community")
                .mission("Fresh food access")
                .submittedAt(OffsetDateTime.now())
                .build());

        BusinessProfile profileB = businessProfileRepository.save(BusinessProfile.builder()
                .application(appB)
                .community(south)
                .businessName("Lebo Fresh")
                .businessType("Service")
                .description("Fresh produce")
                .targetCustomers("Locals")
                .vision("Healthy community")
                .mission("Fresh food access")
                .operatingArea("South")
                .status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now())
                .active(false)
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profileA)
                .date(today)
                .amount(new BigDecimal("500.00"))
                .channel("CASH")
                .entryType(EntryType.INCOME)
                .createdAt(OffsetDateTime.now())
                .build());
        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profileA)
                .date(today.minusDays(3))
                .amount(new BigDecimal("200.00"))
                .channel("MARKETPLACE")
                .entryType(EntryType.EXPENSE)
                .createdAt(OffsetDateTime.now())
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profileB)
                .date(today)
                .amount(new BigDecimal("150.00"))
                .channel("CASH")
                .entryType(EntryType.INCOME)
                .createdAt(OffsetDateTime.now())
                .build());
        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profileB)
                .date(today.minusDays(1))
                .amount(new BigDecimal("40.00"))
                .channel("CASH")
                .entryType(EntryType.EXPENSE)
                .createdAt(OffsetDateTime.now())
                .build());

        List<FacilitatorHustlerResponse> responses = facilitatorService.listActiveHustlers();
        Map<UUID, FacilitatorHustlerResponse> byProfile = responses.stream()
                .collect(Collectors.toMap(FacilitatorHustlerResponse::getBusinessProfileId, r -> r));

        assertThat(byProfile).containsKeys(profileA.getId(), profileB.getId());

        FacilitatorHustlerResponse northResponse = byProfile.get(profileA.getId());
        assertThat(northResponse.getCommunityId()).isEqualTo(north.getId().toString());
        assertThat(northResponse.getCommunityName()).isEqualTo("North Hub");
        assertThat(northResponse.getMonthIncome()).isEqualByComparingTo("500.00");
        assertThat(northResponse.getMonthExpenses()).isEqualByComparingTo("200.00");
        assertThat(northResponse.getMonthProfit()).isEqualByComparingTo("300.00");
        assertThat(northResponse.isActive()).isTrue();

        FacilitatorHustlerResponse southResponse = byProfile.get(profileB.getId());
        assertThat(southResponse.getCommunityId()).isEqualTo(south.getId().toString());
        assertThat(southResponse.getCommunityName()).isEqualTo("South Hub");
        assertThat(southResponse.getMonthIncome()).isEqualByComparingTo("150.00");
        assertThat(southResponse.getMonthExpenses()).isEqualByComparingTo("40.00");
        assertThat(southResponse.getMonthProfit()).isEqualByComparingTo("110.00");
        assertThat(southResponse.isActive()).isFalse();
    }
}
