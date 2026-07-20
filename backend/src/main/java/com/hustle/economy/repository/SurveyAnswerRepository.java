package com.hustle.economy.repository;

import com.hustle.economy.entity.SurveyAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SurveyAnswerRepository extends JpaRepository<SurveyAnswer, UUID> {
    List<SurveyAnswer> findByAssignment_Id(UUID assignmentId);
    Optional<SurveyAnswer> findByAssignment_IdAndQuestion_Id(UUID assignmentId, UUID questionId);
    boolean existsByQuestion_Id(UUID questionId);
}
