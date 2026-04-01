package com.hustle.economy.service;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.EntryType;
import com.hustle.economy.entity.IncomeEntry;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.IncomeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FacilitatorService {

    private final BusinessProfileRepository businessProfileRepository;
    private final IncomeEntryRepository incomeEntryRepository;

    @Transactional(readOnly = true)
    public List<FacilitatorHustlerResponse> listActiveHustlers() {
        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();

        return businessProfileRepository.findAllApprovedFetched().stream()
                .map(bp -> {
                    List<IncomeEntry> entries = incomeEntryRepository
                            .findByBusinessProfileIdAndDateBetween(bp.getId(), monthStart, today);

                    BigDecimal income = entries.stream()
                            .filter(e -> e.getEntryType() == null || e.getEntryType() == EntryType.INCOME)
                            .map(IncomeEntry::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal expenses = entries.stream()
                            .filter(e -> e.getEntryType() == EntryType.EXPENSE)
                            .map(IncomeEntry::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return FacilitatorHustlerResponse.builder()
                            .businessProfileId(bp.getId())
                            .firstName(bp.getApplication().getFirstName())
                            .lastName(bp.getApplication().getLastName())
                            .businessName(bp.getBusinessName())
                            .businessType(bp.getBusinessType())
                            .communityName(bp.getCommunity() != null ? bp.getCommunity().getName() : null)
                            .operatingArea(bp.getOperatingArea())
                            .description(bp.getDescription())
                            .targetCustomers(bp.getTargetCustomers())
                            .vision(bp.getVision())
                            .mission(bp.getMission())
                            .monthIncome(income)
                            .monthExpenses(expenses)
                            .monthProfit(income.subtract(expenses))
                            .build();
                })
                .toList();
    }
}
