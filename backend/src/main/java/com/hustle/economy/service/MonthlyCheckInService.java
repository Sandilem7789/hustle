package com.hustle.economy.service;

import com.hustle.economy.dto.MonthlyCheckInRequest;
import com.hustle.economy.dto.MonthlyCheckInResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.MonthlyCheckIn;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.MonthlyCheckInRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MonthlyCheckInService {

    private final MonthlyCheckInRepository checkInRepository;
    private final BusinessProfileRepository businessProfileRepository;

    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    @Transactional(readOnly = true)
    public List<MonthlyCheckInResponse> list(UUID businessProfileId) {
        return checkInRepository.findByBusinessProfileId(businessProfileId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public MonthlyCheckInResponse record(UUID businessProfileId, MonthlyCheckInRequest request) {
        BusinessProfile profile = businessProfileRepository.findById(businessProfileId)
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found"));

        String currentMonth = LocalDate.now().format(MONTH_FORMAT);

        MonthlyCheckIn checkIn = checkInRepository
                .findByBusinessProfileIdAndVisitMonth(businessProfileId, currentMonth)
                .orElseGet(() -> MonthlyCheckIn.builder()
                        .businessProfile(profile)
                        .visitMonth(currentMonth)
                        .createdAt(OffsetDateTime.now())
                        .build());

        checkIn.setNotes(request.getNotes());
        checkIn.setPhotoUrls(request.getPhotoUrls());
        checkIn.setVisitedBy(request.getVisitedBy());

        return toResponse(checkInRepository.save(checkIn));
    }

    public boolean hasCheckInThisMonth(UUID businessProfileId) {
        String currentMonth = LocalDate.now().format(MONTH_FORMAT);
        return checkInRepository.existsByBusinessProfileIdAndVisitMonth(businessProfileId, currentMonth);
    }

    private MonthlyCheckInResponse toResponse(MonthlyCheckIn c) {
        return MonthlyCheckInResponse.builder()
                .id(c.getId())
                .businessProfileId(c.getBusinessProfile().getId())
                .visitMonth(c.getVisitMonth())
                .photoUrls(c.getPhotoUrls())
                .notes(c.getNotes())
                .visitedBy(c.getVisitedBy())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
