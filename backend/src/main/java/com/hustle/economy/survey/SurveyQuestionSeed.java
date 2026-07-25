package com.hustle.economy.survey;

import com.hustle.economy.entity.SurveyQuestionType;

public record SurveyQuestionSeed(String fieldKey, String questionText, SurveyQuestionType questionType, boolean required) {
}
