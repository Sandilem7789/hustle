package com.hustle.economy.config;

import com.hustle.economy.entity.*;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import com.hustle.economy.repository.ProductRepository;
import com.hustle.economy.repository.SurveyQuestionRepository;
import com.hustle.economy.repository.SurveyTemplateRepository;
import com.hustle.economy.survey.SurveyFieldKeys;
import com.hustle.economy.survey.SurveyQuestionSeed;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final CommunityRepository communityRepository;
    private final HustlerApplicationRepository applicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final ProductRepository productRepository;
    private final SurveyTemplateRepository surveyTemplateRepository;
    private final SurveyQuestionRepository surveyQuestionRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${STAFF_PHONE}")
    private String staffPhone;

    @Value("${STAFF_PASSWORD}")
    private String staffPassword;

    // name, latitude, longitude, province  (approx. coords for northern KZN / Phinda–Mkuze area)
    private static final Object[][] COMMUNITIES = {
            {"KwaNgwenya",    -27.75, 32.13, "KwaZulu-Natal"},
            {"KwaNibela",     -27.88, 32.18, "KwaZulu-Natal"},
            {"KwaMakhasa",    -27.82, 32.08, "KwaZulu-Natal"},
            {"KwaJobe",       -27.93, 32.12, "KwaZulu-Natal"},
            {"KwaMnqobokazi", -27.97, 32.07, "KwaZulu-Natal"},
    };

    @Override
    public void run(ApplicationArguments args) {
        for (Object[] row : COMMUNITIES) {
            String name     = (String) row[0];
            Double lat      = (Double) row[1];
            Double lng      = (Double) row[2];
            String province = (String) row[3];
            communityRepository.findByNameIgnoreCase(name).ifPresentOrElse(
                existing -> {
                    if (existing.getProvince() == null) {
                        existing.setProvince(province);
                        communityRepository.save(existing);
                    }
                },
                () -> communityRepository.save(Community.builder()
                        .name(name)
                        .province(province)
                        .region("KwaZulu-Natal")
                        .latitude(lat)
                        .longitude(lng)
                        .build())
            );
        }
        applicationRepository.backfillNullRoles();
        seedStaffAccount();
        seedSurveyTemplates();
        seedMarketplaceDemoProducts();
    }

    // ── Marketplace demo products ────────────────────────────────────────────
    // Fills out the marketplace with realistic KZN informal-economy listings
    // spread across all 5 seeded communities and all 8 categories, so the
    // frontend can actually be evaluated with real density instead of the 3
    // ad-hoc products created by hand while testing the registration flow.
    // Every mediaUrl points at a flat illustrated icon (not a real photo —
    // this project has no image-generation tool available) served through the
    // existing /api/uploads/{filename} path, copied into the uploads_data
    // volume once; see docs/ for how they were produced.
    // Idempotent: guarded on whether the first new demo seller already exists.
    private void seedMarketplaceDemoProducts() {
        if (businessProfileRepository.findFirstByBusinessName("KwaNibela Green Grocer").isPresent()) return;

        OffsetDateTime now = OffsetDateTime.now();

        // ── Give the two photo-less hand-created products a real image ──────
        productRepository.findFirstByNameIgnoreCase("Vetkoek").ifPresent(p -> {
            p.setMediaUrl("/api/uploads/seed-food-fried-dough.png");
            p.setUpdatedAt(now);
            productRepository.save(p);
        });
        productRepository.findFirstByNameIgnoreCase("Coke 330ml").ifPresent(p -> {
            p.setMediaUrl("/api/uploads/seed-drink-bottle.png");
            p.setUpdatedAt(now);
            productRepository.save(p);
        });

        // ── Resolve the existing sellers we're adding products to ───────────
        // Looked up via a known product rather than by business name, because
        // this dev database already has duplicate "Liskomz Tuck Shop" rows
        // from earlier manual registration testing — anchoring on the
        // product that's demonstrably real/in-use avoids picking the wrong one.
        BusinessProfile isiqalo = productRepository.findFirstByNameIgnoreCase("Vetkoek")
                .map(Product::getBusiness).orElse(null);
        BusinessProfile liskomz = productRepository.findFirstByNameIgnoreCase("Handmade Necklace")
                .map(Product::getBusiness).orElse(null);
        BusinessProfile tojiwe = businessProfileRepository.findFirstByBusinessName("Tojiwe Camp Park").orElse(null);

        // ── New demo sellers, one per community that had none yet ───────────
        BusinessProfile kwaNibelaGrocer = createDemoSeller("KwaNibela Green Grocer", "Product", "KwaNibela", now);
        BusinessProfile makhasaCrafts   = createDemoSeller("Makhasa Crafts Collective", "Product", "KwaMakhasa", now);
        BusinessProfile jobePoultry     = createDemoSeller("Jobe Poultry & Produce", "Product", "KwaJobe", now);
        BusinessProfile mnqobokaziTech  = createDemoSeller("Mnqobokazi Mobile Repairs", "Service & Products", "KwaMnqobokazi", now);

        // name, price (ZAR), category, icon filename, seller
        Object[][] products = {
            {"White Bread Loaf",           "18.00",   ProductCategory.GROCERY,     "grocery-bread-loaf",   isiqalo},
            {"Amasi 1L",                   "20.00",   ProductCategory.GROCERY,     "grocery-bottle-liquid",isiqalo},
            {"Boerewors Roll",             "25.00",   ProductCategory.FAST_FOOD,   "food-bread-roll",      tojiwe},
            {"Firewood Bundle",            "35.00",   ProductCategory.OTHER,       "other-firewood",       tojiwe},
            {"Bunny Chow",                 "35.00",   ProductCategory.FAST_FOOD,   "food-bread-roll",      liskomz},
            {"Amagwinya (Fat Cakes)",      "5.00",    ProductCategory.FAST_FOOD,   "food-fried-dough",     liskomz},
            {"Fresh Spinach Bunch",        "12.00",   ProductCategory.AGRI,        "agri-leaf",            kwaNibelaGrocer},
            {"Free-range Eggs (Dozen)",    "45.00",   ProductCategory.AGRI,        "agri-eggs",            kwaNibelaGrocer},
            {"Butternut Squash",           "15.00",   ProductCategory.AGRI,        "agri-leaf",            kwaNibelaGrocer},
            {"Sunflower Oil 750ml",        "32.00",   ProductCategory.GROCERY,     "grocery-bottle-liquid",kwaNibelaGrocer},
            {"Beaded Bracelet Set",        "60.00",   ProductCategory.CRAFTS,      "craft-beads",          makhasaCrafts},
            {"Woven Grass Basket",         "150.00",  ProductCategory.CRAFTS,      "craft-basket",         makhasaCrafts},
            {"Clay Cooking Pot",           "120.00",  ProductCategory.CRAFTS,      "craft-clay-pot",       makhasaCrafts},
            {"Zulu Isicholo Hat",          "250.00",  ProductCategory.CLOTHING,    "clothing-hat",         makhasaCrafts},
            {"Live Chickens (Each)",       "90.00",   ProductCategory.AGRI,        "agri-poultry",         jobePoultry},
            {"Goat (Live, Mature)",        "1800.00", ProductCategory.AGRI,        "agri-livestock",       jobePoultry},
            {"Maize Meal 5kg",             "65.00",   ProductCategory.GROCERY,     "grocery-sack",         jobePoultry},
            {"Phone Screen Repair",        "250.00",  ProductCategory.SERVICES,    "service-tools",        mnqobokaziTech},
            {"Solar Power Bank",           "180.00",  ProductCategory.ELECTRONICS, "electronics-device",   mnqobokaziTech},
            {"Phone Charger (Universal)",  "60.00",   ProductCategory.ELECTRONICS, "electronics-device",   mnqobokaziTech},
        };

        for (Object[] row : products) {
            BusinessProfile seller = (BusinessProfile) row[4];
            if (seller == null) continue; // seller lookup failed — skip rather than seed an orphaned product
            productRepository.save(Product.builder()
                    .business(seller)
                    .name((String) row[0])
                    .description((String) row[0])
                    .price(new BigDecimal((String) row[1]))
                    .category((ProductCategory) row[2])
                    .mediaUrl("/api/uploads/seed-" + row[3] + ".png")
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }
    }

    private BusinessProfile createDemoSeller(String businessName, String businessType, String communityName, OffsetDateTime now) {
        Community community = communityRepository.findByNameIgnoreCase(communityName).orElse(null);
        if (community == null) return null;
        return businessProfileRepository.save(BusinessProfile.builder()
                .community(community)
                .businessName(businessName)
                .businessType(businessType)
                .status(ApplicationStatus.APPROVED)
                .active(true)
                .createdAt(now)
                .build());
    }

    private void seedStaffAccount() {
        applicationRepository.findFirstByPhoneOrderBySubmittedAtDesc(staffPhone).ifPresentOrElse(
            existing -> {
                // Upgrade existing account to COORDINATOR with correct password
                existing.setRole(UserRole.COORDINATOR);
                existing.setStatus(ApplicationStatus.APPROVED);
                existing.setPasswordHash(passwordEncoder.encode(staffPassword));
                applicationRepository.save(existing);
            },
            () -> {
                Community community = communityRepository.findByNameIgnoreCase("KwaNgwenya").orElse(null);
                if (community == null) return;
                OffsetDateTime now = OffsetDateTime.now();
                HustlerApplication app = applicationRepository.save(HustlerApplication.builder()
                        .firstName("Sandile")
                        .lastName("Mathenjwa")
                        .phone(staffPhone)
                        .passwordHash(passwordEncoder.encode(staffPassword))
                        .community(community)
                        .businessName("Hustle Operations")
                        .businessType("Service")
                        .status(ApplicationStatus.APPROVED)
                        .role(UserRole.COORDINATOR)
                        .submittedAt(now)
                        .decidedAt(now)
                        .build());
                businessProfileRepository.save(BusinessProfile.builder()
                        .application(app)
                        .community(community)
                        .businessName("Hustle Operations")
                        .businessType("Service")
                        .status(ApplicationStatus.APPROVED)
                        .createdAt(now)
                        .build());
            }
        );
    }

    // ── Default survey templates ────────────────────────────────────────────
    // Note: no PROFILE template — that document is generated from existing
    // BusinessProfile/Applicant/BaselineSurveyResponse data, not a separate survey.
    // Question definitions live in SurveyFieldKeys, shared with the
    // /available-field-keys endpoint so the canonical keys never drift apart.
    private void seedSurveyTemplates() {
        seedSurveyTemplate(SurveyType.BASELINE, "Baseline Survey");
        reconcileGrowthPlanQuestions();
    }

    // The GROWTH_PLAN question set was redesigned to ask more granular, structured questions
    // (explicit before/after figures, itemised seed capital costs) so the n8n document-generation
    // pipeline can build an accurate report matching the Growth Plan template. Unlike
    // seedSurveyTemplate(), this runs against an already-seeded production template: it adds any
    // canonical fieldKey that's missing, refreshes text/order for ones that already exist, and
    // deactivates superseded fieldKeys — never hard-deletes, so historical answers on the old
    // questions stay readable. Idempotent: safe to run on every startup.
    private void reconcileGrowthPlanQuestions() {
        SurveyTemplate template = surveyTemplateRepository.findByTypeAndActiveTrue(SurveyType.GROWTH_PLAN)
                .stream().findFirst()
                .orElseGet(() -> surveyTemplateRepository.save(SurveyTemplate.builder()
                        .type(SurveyType.GROWTH_PLAN)
                        .name("Growth Plan Survey")
                        .active(true)
                        .createdAt(OffsetDateTime.now())
                        .build()));

        List<SurveyQuestion> existing = surveyQuestionRepository.findByTemplate_IdOrderByOrderIndexAsc(template.getId());
        Map<String, SurveyQuestion> byFieldKey = existing.stream()
                .collect(Collectors.toMap(SurveyQuestion::getFieldKey, q -> q, (a, b) -> a));

        List<SurveyQuestionSeed> canonical = SurveyFieldKeys.GROWTH_PLAN;
        Set<String> canonicalKeys = canonical.stream().map(SurveyQuestionSeed::fieldKey).collect(Collectors.toSet());

        int orderIndex = 0;
        for (SurveyQuestionSeed seed : canonical) {
            SurveyQuestion question = byFieldKey.getOrDefault(seed.fieldKey(),
                    SurveyQuestion.builder().template(template).fieldKey(seed.fieldKey()).build());
            question.setOrderIndex(orderIndex++);
            question.setQuestionText(seed.questionText());
            question.setQuestionType(seed.questionType());
            question.setRequired(seed.required());
            question.setActive(true);
            surveyQuestionRepository.save(question);
        }

        for (SurveyQuestion question : existing) {
            if (question.isActive() && !canonicalKeys.contains(question.getFieldKey())) {
                question.setActive(false);
                surveyQuestionRepository.save(question);
            }
        }
    }

    private void seedSurveyTemplate(SurveyType type, String name) {
        // Only seed if no template of this type exists yet — a facilitator may have since edited/deactivated it.
        if (surveyTemplateRepository.existsByType(type)) return;

        OffsetDateTime now = OffsetDateTime.now();
        SurveyTemplate template = surveyTemplateRepository.save(SurveyTemplate.builder()
                .type(type)
                .name(name)
                .active(true)
                .createdAt(now)
                .build());

        int orderIndex = 0;
        for (SurveyQuestionSeed seed : SurveyFieldKeys.seedsFor(type)) {
            surveyQuestionRepository.save(SurveyQuestion.builder()
                    .template(template)
                    .orderIndex(orderIndex++)
                    .questionText(seed.questionText())
                    .fieldKey(seed.fieldKey())
                    .questionType(seed.questionType())
                    .required(seed.required())
                    .active(true)
                    .build());
        }
    }
}
