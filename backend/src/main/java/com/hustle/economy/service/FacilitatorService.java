package com.hustle.economy.service;

import com.hustle.economy.dto.FacilitatorHustlerResponse;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.IncomeEntryRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FacilitatorService {

    private final BusinessProfileRepository businessProfileRepository;
    private final IncomeEntryRepository incomeEntryRepository;
    private final MonthlyCheckInService monthlyCheckInService;

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

                    return toResponse(bp, income, expenses);
                })
                .toList();
    }

    @Transactional
    public FacilitatorHustlerResponse setActive(UUID businessProfileId, boolean active) {
        BusinessProfile bp = businessProfileRepository.findById(businessProfileId)
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found"));
        bp.setActive(active);
        businessProfileRepository.save(bp);

        LocalDate monthStart = LocalDate.now().withDayOfMonth(1);
        LocalDate today = LocalDate.now();
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

        return toResponse(bp, income, expenses);
    }

    private FacilitatorHustlerResponse toResponse(BusinessProfile bp, BigDecimal income, BigDecimal expenses) {
        boolean missedCheckIn = !monthlyCheckInService.hasCheckInThisMonth(bp.getId());
        return FacilitatorHustlerResponse.builder()
                .businessProfileId(bp.getId())
                .applicationId(bp.getApplication() != null ? bp.getApplication().getId() : null)
                .communityId(bp.getCommunity() != null ? bp.getCommunity().getId().toString() : null)
                .firstName(bp.getApplication() != null ? bp.getApplication().getFirstName() : "")
                .lastName(bp.getApplication() != null ? bp.getApplication().getLastName() : "")
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
                .active(bp.isActive())
                .missedCheckIn(missedCheckIn)
                .build();
    }
}
