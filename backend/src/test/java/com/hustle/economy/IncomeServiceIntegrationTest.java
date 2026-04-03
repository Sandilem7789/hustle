package com.hustle.economy;

import com.hustle.economy.dto.IncomeSummaryResponse;
import com.hustle.economy.entity.ApplicationStatus;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.EntryType;
import com.hustle.economy.entity.IncomeEntry;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.IncomeEntryRepository;
import com.hustle.economy.service.IncomeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class IncomeServiceIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private IncomeService incomeService;

    @Autowired
    private IncomeEntryRepository incomeEntryRepository;

    @Autowired
    private BusinessProfileRepository businessProfileRepository;

    @Autowired
    private CommunityRepository communityRepository;

    @BeforeEach
    void cleanDatabase() {
        incomeEntryRepository.deleteAll();
        businessProfileRepository.deleteAll();
    }

    @Test
    void summaryAccuratelyCombinesCashAndMarketplaceIncome() {
        LocalDate today = LocalDate.now();
        Community community = communityRepository.save(Community.builder()
                .name("Test Community")
                .region("Test Region")
                .build());

        BusinessProfile profile = businessProfileRepository.save(BusinessProfile.builder()
                .businessName("Zulu Beads")
                .businessType("Service")
                .community(community)
                .status(ApplicationStatus.APPROVED)
                .createdAt(OffsetDateTime.now())
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profile)
                .date(today)
                .amount(new BigDecimal("120.50"))
                .channel("CASH")
                .entryType(EntryType.INCOME)
                .notes("Popup market")
                .createdAt(OffsetDateTime.now())
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profile)
                .date(today)
                .amount(new BigDecimal("80.25"))
                .channel("MARKETPLACE")
                .entryType(EntryType.INCOME)
                .notes("Marketplace sale")
                .createdAt(OffsetDateTime.now())
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profile)
                .date(today)
                .amount(new BigDecimal("30.00"))
                .channel("CASH")
                .entryType(EntryType.EXPENSE)
                .notes("Transport")
                .createdAt(OffsetDateTime.now())
                .build());

        incomeEntryRepository.save(IncomeEntry.builder()
                .businessProfile(profile)
                .date(today.minusMonths(2))
                .amount(new BigDecimal("999.99"))
                .channel("CASH")
                .entryType(EntryType.INCOME)
                .notes("Ignored old income")
                .createdAt(OffsetDateTime.now())
                .build());

        IncomeSummaryResponse summary = incomeService.getSummary(profile.getId());

        assertThat(summary.getTodayIncome()).isEqualByComparingTo("200.75");
        assertThat(summary.getTodayExpenses()).isEqualByComparingTo("30.00");
        assertThat(summary.getTodayProfit()).isEqualByComparingTo("170.75");

        assertThat(summary.getWeekIncome()).isEqualByComparingTo(summary.getTodayIncome());
        assertThat(summary.getWeekExpenses()).isEqualByComparingTo(summary.getTodayExpenses());
        assertThat(summary.getWeekProfit()).isEqualByComparingTo(summary.getTodayProfit());

        assertThat(summary.getMonthIncome()).isEqualByComparingTo(summary.getTodayIncome());
        assertThat(summary.getMonthExpenses()).isEqualByComparingTo(summary.getTodayExpenses());
        assertThat(summary.getMonthProfit()).isEqualByComparingTo(summary.getTodayProfit());
    }
}
