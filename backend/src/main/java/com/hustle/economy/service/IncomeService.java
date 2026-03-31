package com.hustle.economy.service;

import com.hustle.economy.dto.IncomeEntryRequest;
import com.hustle.economy.dto.IncomeEntryResponse;
import com.hustle.economy.dto.IncomeSummaryResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.IncomeEntry;
import com.hustle.economy.repository.IncomeEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class IncomeService {

    private final IncomeEntryRepository incomeEntryRepository;

    @Transactional
    public IncomeEntryResponse logIncome(IncomeEntryRequest request, BusinessProfile profile) {
        IncomeEntry entry = IncomeEntry.builder()
                .businessProfile(profile)
                .date(request.getDate())
                .amount(request.getAmount())
                .channel(request.getChannel().toUpperCase(Locale.ROOT))
                .notes(request.getNotes())
                .createdAt(OffsetDateTime.now())
                .build();
        return toResponse(incomeEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public List<IncomeEntryResponse> listMyIncome(UUID businessProfileId, LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return incomeEntryRepository.findByBusinessProfileIdAndDateBetween(businessProfileId, from, to)
                    .stream().map(this::toResponse).toList();
        }
        return incomeEntryRepository.findByBusinessProfileId(businessProfileId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public IncomeSummaryResponse getSummary(UUID businessProfileId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);
        LocalDate monthStart = today.withDayOfMonth(1);

        List<IncomeEntry> all = incomeEntryRepository.findByBusinessProfileId(businessProfileId);

        BigDecimal todayTotal = sum(all, today, today);
        BigDecimal weekTotal = sum(all, weekStart, today);
        BigDecimal monthTotal = sum(all, monthStart, today);
        BigDecimal cash = all.stream().filter(e -> "CASH".equals(e.getChannel()))
                .map(IncomeEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal marketplace = all.stream().filter(e -> "MARKETPLACE".equals(e.getChannel()))
                .map(IncomeEntry::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        return IncomeSummaryResponse.builder()
                .today(todayTotal).weekToDate(weekTotal).monthToDate(monthTotal)
                .totalCash(cash).totalMarketplace(marketplace)
                .build();
    }

    @Transactional(readOnly = true)
    public String generateCsv(UUID businessProfileId, String period) {
        LocalDate today = LocalDate.now();
        LocalDate from = "monthly".equals(period) ? today.withDayOfMonth(1) :
                today.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);

        List<IncomeEntry> entries = incomeEntryRepository
                .findByBusinessProfileIdAndDateBetween(businessProfileId, from, today);

        StringBuilder sb = new StringBuilder("Date,Amount,Channel,Notes\n");
        for (IncomeEntry e : entries) {
            sb.append(e.getDate()).append(",")
              .append(e.getAmount()).append(",")
              .append(e.getChannel()).append(",")
              .append(e.getNotes() != null ? e.getNotes().replace(",", ";") : "").append("\n");
        }
        return sb.toString();
    }

    private BigDecimal sum(List<IncomeEntry> entries, LocalDate from, LocalDate to) {
        return entries.stream()
                .filter(e -> !e.getDate().isBefore(from) && !e.getDate().isAfter(to))
                .map(IncomeEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private IncomeEntryResponse toResponse(IncomeEntry e) {
        return IncomeEntryResponse.builder()
                .id(e.getId()).date(e.getDate()).amount(e.getAmount())
                .channel(e.getChannel()).notes(e.getNotes()).createdAt(e.getCreatedAt())
                .build();
    }
}
