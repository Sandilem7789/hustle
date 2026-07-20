package com.hustle.economy.repository;

import com.hustle.economy.entity.SurveyTemplate;
import com.hustle.economy.entity.SurveyType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SurveyTemplateRepository extends JpaRepository<SurveyTemplate, UUID> {
    List<SurveyTemplate> findByActiveTrue();
    List<SurveyTemplate> findByTypeAndActiveTrue(SurveyType type);
    boolean existsByType(SurveyType type);
}
