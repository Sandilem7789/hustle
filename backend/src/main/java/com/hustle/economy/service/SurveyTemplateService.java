package com.hustle.economy.service;

import com.hustle.economy.dto.SurveyTemplateRequest;
import com.hustle.economy.dto.SurveyTemplateResponse;
import com.hustle.economy.entity.SurveyTemplate;
import com.hustle.economy.entity.SurveyType;
import com.hustle.economy.mapper.SurveyMapper;
import com.hustle.economy.repository.SurveyTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SurveyTemplateService {

    private final SurveyTemplateRepository templateRepository;
    private final SurveyMapper mapper;

    @Transactional(readOnly = true)
    public List<SurveyTemplateResponse> list() {
        return templateRepository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SurveyTemplateResponse> listActive(SurveyType type) {
        List<SurveyTemplate> templates = type != null
                ? templateRepository.findByTypeAndActiveTrue(type)
                : templateRepository.findByActiveTrue();
        return templates.stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public SurveyTemplateResponse create(SurveyTemplateRequest request) {
        SurveyTemplate template = SurveyTemplate.builder()
                .type(SurveyType.valueOf(request.getType().toUpperCase()))
                .name(request.getName())
                .description(request.getDescription())
                .active(request.getActive() == null || request.getActive())
                .createdAt(OffsetDateTime.now())
                .build();
        return mapper.toResponse(templateRepository.save(template));
    }

    @Transactional
    public SurveyTemplateResponse update(UUID id, SurveyTemplateRequest request) {
        SurveyTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Survey template not found"));
        template.setType(SurveyType.valueOf(request.getType().toUpperCase()));
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        if (request.getActive() != null) {
            template.setActive(request.getActive());
        }
        return mapper.toResponse(templateRepository.save(template));
    }

    @Transactional
    public SurveyTemplateResponse setActive(UUID id, boolean active) {
        SurveyTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Survey template not found"));
        template.setActive(active);
        return mapper.toResponse(templateRepository.save(template));
    }
}
