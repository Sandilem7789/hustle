package com.hustle.economy.service;

import com.hustle.economy.dto.SurveyQuestionReorderRequest;
import com.hustle.economy.dto.SurveyQuestionRequest;
import com.hustle.economy.dto.SurveyQuestionResponse;
import com.hustle.economy.entity.SurveyQuestion;
import com.hustle.economy.entity.SurveyQuestionType;
import com.hustle.economy.entity.SurveyTemplate;
import com.hustle.economy.mapper.SurveyMapper;
import com.hustle.economy.repository.SurveyAnswerRepository;
import com.hustle.economy.repository.SurveyQuestionRepository;
import com.hustle.economy.repository.SurveyTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SurveyQuestionService {

    private final SurveyQuestionRepository questionRepository;
    private final SurveyTemplateRepository templateRepository;
    private final SurveyAnswerRepository answerRepository;
    private final SurveyMapper mapper;

    @Transactional(readOnly = true)
    public List<SurveyQuestionResponse> listForTemplate(UUID templateId) {
        return questionRepository.findByTemplate_IdOrderByOrderIndexAsc(templateId)
                .stream().map(mapper::toResponse).toList();
    }

    @Transactional
    public SurveyQuestionResponse create(UUID templateId, SurveyQuestionRequest request) {
        SurveyTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new EntityNotFoundException("Survey template not found"));

        if (request.getFieldKey() == null || request.getFieldKey().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fieldKey is required");
        }
        questionRepository.findByTemplate_IdAndFieldKey(templateId, request.getFieldKey())
                .ifPresent(q -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "fieldKey already exists on this template");
                });

        int nextOrder = questionRepository.findByTemplate_IdOrderByOrderIndexAsc(templateId).stream()
                .mapToInt(SurveyQuestion::getOrderIndex).max().orElse(-1) + 1;

        SurveyQuestion question = SurveyQuestion.builder()
                .template(template)
                .orderIndex(nextOrder)
                .questionText(request.getQuestionText())
                .fieldKey(request.getFieldKey())
                .questionType(SurveyQuestionType.valueOf(request.getQuestionType().toUpperCase()))
                .options(mapper.writeOptions(request.getOptions()))
                .required(request.isRequired())
                .helpText(request.getHelpText())
                .active(true)
                .build();
        return mapper.toResponse(questionRepository.save(question));
    }

    @Transactional
    public SurveyQuestionResponse update(UUID questionId, SurveyQuestionRequest request) {
        SurveyQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Survey question not found"));

        // fieldKey is intentionally never updated here — it must stay stable for the document pipeline.
        question.setQuestionText(request.getQuestionText());
        question.setQuestionType(SurveyQuestionType.valueOf(request.getQuestionType().toUpperCase()));
        question.setOptions(mapper.writeOptions(request.getOptions()));
        question.setRequired(request.isRequired());
        question.setHelpText(request.getHelpText());
        return mapper.toResponse(questionRepository.save(question));
    }

    @Transactional
    public void reorder(UUID templateId, SurveyQuestionReorderRequest request) {
        List<SurveyQuestion> questions = questionRepository.findByTemplate_IdOrderByOrderIndexAsc(templateId);
        Map<UUID, SurveyQuestion> byId = questions.stream()
                .collect(Collectors.toMap(SurveyQuestion::getId, q -> q));

        List<UUID> orderedIds = request.getOrderedQuestionIds();
        for (int i = 0; i < orderedIds.size(); i++) {
            SurveyQuestion question = byId.get(orderedIds.get(i));
            if (question == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown question id in reorder list");
            }
            question.setOrderIndex(i);
        }
        questionRepository.saveAll(byId.values());
    }

    // Soft-delete only — a question with existing SurveyAnswer rows must stay readable in past responses.
    @Transactional
    public SurveyQuestionResponse setActive(UUID questionId, boolean active) {
        SurveyQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Survey question not found"));
        question.setActive(active);
        return mapper.toResponse(questionRepository.save(question));
    }

    // True hard-delete — only permitted when nobody has answered this question yet.
    @Transactional
    public void delete(UUID questionId) {
        SurveyQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new EntityNotFoundException("Survey question not found"));

        if (answerRepository.existsByQuestion_Id(questionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This question already has responses — deactivate it instead of deleting.");
        }

        questionRepository.delete(question);
    }
}
