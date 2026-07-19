package com.hustle.economy.repository;

import com.hustle.economy.entity.SurveyQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyQuestionRepository extends JpaRepository<SurveyQuestion, UUID> {
    List<SurveyQuestion> findByTemplate_IdOrderByOrderIndexAsc(UUID templateId);
    List<SurveyQuestion> findByTemplate_IdAndActiveTrueOrderByOrderIndexAsc(UUID templateId);
    Optional<SurveyQuestion> findByTemplate_IdAndFieldKey(UUID templateId, String fieldKey);
}
