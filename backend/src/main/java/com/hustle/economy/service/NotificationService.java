package com.hustle.economy.service;

import com.hustle.economy.dto.NotificationResponse;
import com.hustle.economy.entity.BusinessProfile;
import com.hustle.economy.entity.Notification;
import com.hustle.economy.entity.NotificationType;
import com.hustle.economy.mapper.SurveyMapper;
import com.hustle.economy.repository.NotificationRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SurveyMapper mapper;

    @Transactional
    public void create(BusinessProfile recipient, NotificationType type, String title, String body, String linkPath) {
        Notification notification = Notification.builder()
                .businessProfile(recipient)
                .type(type)
                .title(title)
                .body(body)
                .linkPath(linkPath)
                .read(false)
                .createdAt(OffsetDateTime.now())
                .build();
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listForBusinessProfile(UUID businessProfileId) {
        return notificationRepository.findByBusinessProfile_IdOrderByCreatedAtDesc(businessProfileId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public NotificationResponse markRead(UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new EntityNotFoundException("Notification not found"));
        notification.setRead(true);
        return mapper.toResponse(notificationRepository.save(notification));
    }
}
