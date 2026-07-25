package com.hustle.economy.survey;

import com.hustle.economy.entity.SurveyQuestionType;
import com.hustle.economy.entity.SurveyType;

import java.util.List;

// Single source of truth for the canonical fieldKeys the document-generation pipeline
// depends on. DataInitializer seeds new templates from these lists; the
// /available-field-keys endpoint reads from the same lists so the two never drift apart.
public final class SurveyFieldKeys {

    private SurveyFieldKeys() {
    }

    public static final List<SurveyQuestionSeed> BASELINE = List.of(
            new SurveyQuestionSeed("company_description", "Give a brief description of your business — what it sells or does, and who it serves.", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("ownership_structure", "How is the business owned? Are there any partners or people who help run it?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("market", "Who are your customers, and who are your main competitors?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("governance_structures", "How do you currently manage the business day-to-day? (e.g. record keeping, bank account, decision-making)", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("skills_gap", "What skills do you feel you're missing to run this business well?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("reason_for_participating", "Why do you want to be part of the Hustle Economy programme?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("key_business_challenges", "What are the biggest challenges facing your business right now?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("short_term_goal", "What's one goal you want to achieve in the next few months?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("medium_term_goal", "What's a goal for the next year?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("long_term_goal", "Where do you want this business to be in 3-5 years?", SurveyQuestionType.TEXTAREA, true)
    );

    public static final List<SurveyQuestionSeed> GROWTH_PLAN = List.of(
            new SurveyQuestionSeed("business_focus_description", "Briefly describe your business and its focus — what does it sell, and to who?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("current_financial_status", "What is the current financial status of your business?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("seed_capital_breakdown", "List the items you plan to buy with the seed capital and their approximate cost.", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("purchase_location", "Where will you purchase these items?", SurveyQuestionType.TEXT, true),
            new SurveyQuestionSeed("revenue_increase_explanation", "How will this seed capital increase your revenue? Who will buy from you as a result?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("expense_increase_explanation", "Will this seed capital increase your expenses? (e.g. extra rent, electricity, insurance)", SurveyQuestionType.TEXTAREA, false),
            new SurveyQuestionSeed("challenges_to_address", "What challenges will this seed capital help you address?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("projected_revenue", "Projected monthly revenue after receiving seed capital (R)", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("projected_expenses", "Projected monthly expenses after receiving seed capital (R)", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("projected_profit", "Projected monthly profit after receiving seed capital (R)", SurveyQuestionType.NUMBER, true)
    );

    // Note: no PROFILE seed — that document is generated from existing
    // BusinessProfile/Applicant/BaselineSurveyResponse data, not a separate survey.
    public static List<SurveyQuestionSeed> seedsFor(SurveyType type) {
        return switch (type) {
            case BASELINE -> BASELINE;
            case GROWTH_PLAN -> GROWTH_PLAN;
            case PROFILE -> List.of();
        };
    }

    public static List<String> fieldKeysFor(SurveyType type) {
        return seedsFor(type).stream().map(SurveyQuestionSeed::fieldKey).toList();
    }
}
