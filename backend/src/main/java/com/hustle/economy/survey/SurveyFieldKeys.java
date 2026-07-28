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
            new SurveyQuestionSeed("current_monthly_revenue", "What is your business's current average monthly revenue (R)?", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("current_monthly_expenses", "What is your business's current average monthly expenses (R)?", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("current_financial_notes", "Any extra detail on recent financial performance? (e.g. month-by-month figures, trends, seasonal changes)", SurveyQuestionType.TEXTAREA, false),
            new SurveyQuestionSeed("seed_capital_problem", "What problem or limitation is the business currently facing that this equipment will solve? (e.g. old/broken equipment, a slow manual process, no equipment at all)", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("seed_capital_solution", "How will the new equipment or item solve this problem and improve the business?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("seed_capital_items_breakdown", "List each item to be purchased with the seed capital and its cost — one per line, e.g. \"Braai stand – R7 000\". Include a delivery fee line if there is one.", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("total_item_cost", "What is the total cost of all items (R)?", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("business_savings_contribution", "How much will the business contribute from its own savings (R)?", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("seed_capital_requested", "How much seed capital funding is being requested (R)? (total item cost minus business savings)", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("purchase_location", "Where will these items be purchased?", SurveyQuestionType.TEXT, true),
            new SurveyQuestionSeed("revenue_increase_explanation", "Explain how this seed capital will increase revenue. For each product or service affected, give the current (before) and expected (after) monthly figures, and say who the additional customers will be.", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("expense_increase_explanation", "Explain how this seed capital will affect monthly expenses (e.g. electricity, transport, stock, insurance, rent). Give current (before) and expected (after) figures for each cost that changes.", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("challenges_to_address", "What challenges will this seed capital help address, and how will they be managed?", SurveyQuestionType.TEXTAREA, true),
            new SurveyQuestionSeed("projected_monthly_revenue", "Projected total monthly revenue after receiving seed capital (R)", SurveyQuestionType.NUMBER, true),
            new SurveyQuestionSeed("projected_monthly_expenses", "Projected total monthly expenses after receiving seed capital (R)", SurveyQuestionType.NUMBER, true)
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
