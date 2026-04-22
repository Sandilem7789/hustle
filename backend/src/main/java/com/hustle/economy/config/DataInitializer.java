package com.hustle.economy.config;

import com.hustle.economy.entity.*;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final CommunityRepository communityRepository;
    private final ApplicantRepository applicantRepository;
    private final HustlerApplicationRepository applicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${FACILITATOR_PHONE:0000000001}")
    private String facilitatorPhone;

    @Value("${FACILITATOR_PASSWORD:Hustle@2026}")
    private String facilitatorPassword;

    // name, latitude, longitude  (approx. coords for northern KZN / Phinda–Mkuze area)
    private static final Object[][] COMMUNITIES = {
            {"KwaNgwenya",    -27.75, 32.13},
            {"KwaNibela",     -27.88, 32.18},
            {"KwaMakhasa",    -27.82, 32.08},
            {"KwaJobe",       -27.93, 32.12},
            {"KwaMnqobokazi", -27.97, 32.07},
    };

    @Override
    public void run(ApplicationArguments args) {
        for (Object[] row : COMMUNITIES) {
            String name = (String) row[0];
            if (communityRepository.findByNameIgnoreCase(name).isEmpty()) {
                communityRepository.save(Community.builder()
                        .name(name)
                        .region("KwaZulu-Natal")
                        .latitude((Double) row[1])
                        .longitude((Double) row[2])
                        .build());
            }
        }
        seedFacilitatorAccount();
        seedKwaNgwenyaApplicants();
    }

    private void seedFacilitatorAccount() {
        if (applicationRepository.findFirstByPhoneOrderBySubmittedAtDesc(facilitatorPhone).isPresent()) return;

        Community community = communityRepository.findByNameIgnoreCase("KwaNgwenya").orElse(null);
        if (community == null) return;

        OffsetDateTime now = OffsetDateTime.now();

        HustlerApplication app = applicationRepository.save(HustlerApplication.builder()
                .firstName("Sandile")
                .lastName("Mathenjwa")
                .phone(facilitatorPhone)
                .passwordHash(passwordEncoder.encode(facilitatorPassword))
                .community(community)
                .businessName("Hustle Facilitation")
                .businessType("Service")
                .status(ApplicationStatus.APPROVED)
                .role(UserRole.FACILITATOR)
                .submittedAt(now)
                .decidedAt(now)
                .build());

        businessProfileRepository.save(BusinessProfile.builder()
                .application(app)
                .community(community)
                .businessName("Hustle Facilitation")
                .businessType("Service")
                .status(ApplicationStatus.APPROVED)
                .createdAt(now)
                .build());
    }

    // ── KwaNgwenya applicant seed ──────────────────────────────────────────
    // Columns: firstName, lastName, gender, age(null=unknown), phone, email(null=none),
    //          typeOfHustle, rawCallStatus, districtSection, cohortNumber
    private static final Object[][] KWANGWENYA_DATA = {
        {"Amahle",                  "Nkosi",         "Female", 20, "079 125 5103",  "amahlenkosi188@gmail.com",             "Nail Technician",          "missed call", "",               8},
        {"Amahle Dumakahle",        "Ximba",          "Male",  21, "076 371 9416",  "xdumanikahle@gmail.com",               "Fashion Designing",        "yes",         "kwantaba",        8},
        {"Andile",                  "Mandonsela",     "Male",  22, "076 129 9043",  null,                                   "Goat vet",                 "missed call", "",               8},
        {"Anele Hlengiwe",          "Mathenjwa",      "Female",23, "076 670 6220",  "anelehlengiwe844@gmail.com",           "Baking",                   "",            "",               4},
        {"Anele Lwandile",          "Gumbi",          "Female",18, "077 427 2121",  "anelegumbi02@gmail.com",               "Beadwork",                 "yes",         "mhlekazi",        8},
        {"Ayanda",                  "Mngomezulu",     "Female",36, "079 137 3764",  "mngomezuluayanda@gmail.com",           "Poultry farming",          "",            "",               8},
        {"Ayanda Nelly",            "Mngomezulu",     "Female",22, "079 704 5594",  "ayandamngomezulu128@gmail.com",        "Tuckshop",                 "yes",         "mhlekazi",        8},
        {"Bandiswa",                "Mathe",          "Female",24, "066 083 8266",  "mathebandizwa75@gmail.com",            "Spilling",                 "missed call", "",               8},
        {"Banele Thandeka",         "Nyawo",          "Female",21, "067 451 7971",  null,                                   "Tuckshop",                 "yes",         "madanyini",       1},
        {"Bongiwe Dareen",          "Nkosi",          "Female",34, "067 305 6263",  "bongiwedareen4@gmail.com",             "Poultry farming",          "yes",         "thembalethu",     1},
        {"Fezile Malibonge",        "Fakude",         "Female",31, "066 497 9719",  "fezilemalibongwe@gmail.com",           "Livestock medication",     "yes",         "",               8},
        {"Jabu",                    "Khoza",          "Female",28, "066 102 4348",  "khozajabu6610@gmail.com",              "Fast food",                "voicemail",   "",               8},
        {"Khululiwe Celimpilo",     "Mngomezulu",     "Female",30, "079 778 7072",  "khululiwemngomezulu12@gmail.com",      "Hand work",                "voicemail",   "",               8},
        {"Lindiwe Yvonne",          "Dlamini",        "Female",31, "079 680 9576",  "lindiweyvonnedlamini94@gmail.com",     "Clothing boutique",        "yes",         "mkuze wamanzi",   1},
        {"Londeka",                 "Mhlongo",        "Female",19, "066 418 0087",  "londekamhlongo@gmail.com",             "Baking",                   "yes",         "mhlekazi",        8},
        {"Londeka",                 "Sibiya",         "Female",22, "079 366 2481",  "londekasbiya01@gmail.com",             "Fast food",                "missed call", "",               8},
        {"Londiwe",                 "Ngubane",        "Female",27, "072 744 0264",  null,                                   "Clothing",                 "yes",         "ehlanzeni",       1},
        {"Londiwe Ntombizini",      "Myeni",          "Female",35, "072 748 2296",  "Londiwemyeni010@gmail.com",            "Tuck Shop",                "yes",         "kwantaba",        8},
        {"Londiwe Samukelisiwe",    "Nyawo",          "Female",25, "076 278 0225",  "londiwesamukelisiwe97@gmail.com",      "Small Tuck Shop",          "yes",         "kwantaba",        8},
        {"Lungisani",               "Mabika",         "Male",  25, "082 356 5701",  null,                                   "Tuckshop",                 "voicemail",   "",               8},
        {"Lungisani Wiseman",       "Ngema",          "Male",  34, "072 378 8587",  "ngemalungisani188@gmail.com",          "Tuckshop",                 "",            "",               8},
        {"Luyanda Mbalenhle",       "Gumede",         "Female",25, "071 559 4484",  "Luyandambalenhle3@gmail.com",          "The Perfume Co Africa",    "yes",         "hlanzeni",        8},
        {"Mbalenhle Kwanele",       "Mfekayi",        "Female",29, "076 720 2170",  "mfekayimbalenhle25@gmail.com",         "Poultry farming",          "missed call", "",               8},
        {"Mboneni",                 "Fakude",         "Male",  29, "076 902 0893",  null,                                   "Perfumes",                 "",            "",               8},
        {"Mthobisi",                "Mtshali",        "Male",  25, "071 116 4380",  null,                                   "Goat farming",             "",            "",               8},
        {"Muzikayise",              "Mkhabangobe",    "Male",  29, "076 956 2133",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Mvuselelo",               "Lushaba",        "Male",  26, "073 554 9128",  null,                                   "Clothing & Products",      "missed call", "",               8},
        {"Ncamisile",               "Gumede",         "Female",28, "072 675 5568",  null,                                   "Clothes",                  "missed call", "",               8},
        {"Ncebo Shampi",            "Khumalo",        "Male",  32, "072 277 3201",  null,                                   "Grass Cutting",            "yes",         "",               8},
        {"Nduduzo",                 "Myeni",          "Male",  28, "076 324 7596",  null,                                   "Farming",                  "missed call", "",               8},
        {"Nelisiwe Zibuyisile",     "Dladla",         "Female",23, "076 393 2756",  null,                                   "Tuckshop",                 "",            "",               4},
        {"Nobuhle",                 "Dladla",         "Female",28, "064 620 3573",  null,                                   "Fast food",                "yes",         "mhlekazi",        8},
        {"Nokulunga",               "Kwanele",        "Female",22, "082 647 9058",  null,                                   "Cosmetics",                "yes",         "mhlekazi",        8},
        {"Nokuthula",               "Nxumalo",        "Female",34, "066 134 2944",  null,                                   "Salon and tuckshop",       "yes",         "",               8},
        {"Nokwanda",                "Ntenga",         "Female",22, "064 649 4736",  null,                                   "Clothing",                 "yes",         "nhlonhlela",      1},
        {"NokwazI",                 "Fakude",         "Female",28, "079 771 0481",  "kwazijoy@gmail.com",                   "Tuckshop",                 "yes",         "mpungamlilo",     1},
        {"Nombuso Mamazana",        "Myeni",          "Female",31, "063 672 3641",  "nombusom024@gmail.com",                "Poultry farming",          "yes",         "mhlekazi",        8},
        {"Nompiliso",               "Madonsela",      "Female",33, "082 397 8113",  null,                                   "Fast Food",                "yes",         "mhlekazi",        8},
        {"Nompumelelo",             "Myeni",          "Female",27, "076 906 3506",  "nompumeleloloh3@gmail.com",            "Small Tuck Shop",          "missed call", "",               8},
        {"Nomthandazo Thobile",     "Myeni",          "Female",31, "079 421 8837",  "nomthanzomyeni@gmail.com",             "Cooking & Baking",         "yes",         "kwantaba",        8},
        {"Nomvula Thandeka",        "Mhlanga",        "Female",32, "079 751 5017",  "nomvulat09@gmail.com",                 "Salon",                    "missed call", "",               8},
        {"Nonsikelelo Nomfundo",    "Fakude",         "Female",27, "082 627 4566",  "fakudensikelelo10@gmail.com",          "Trading",                  "yes",         "Ngudeni",         1},
        {"Nontuthuko Sihle",        "Gumede",         "Female",27, "079 927 1755",  null,                                   "Weaves",                   "yes",         "mhlekazi",        8},
        {"Nothando",                "Dladla",         "Female",25, "072 724 6343",  "dladlanothando031@gmail.com",          "Sewing and Baking",        "missed call", "",               8},
        {"Nothando Noxolo",         "Gumbi",          "Female",28, "076 812 6671",  null,                                   "Small Tuck Shop",          "",            "",               8},
        {"Nqobile",                 "Thabethe",       "Female",27, "079 157 6105",  "nqobilethabethe08@gmail.com",          "Poultry farming",          "",            "",               8},
        {"Nqobile",                 "Thabethe",       "Female",31, "060 697 5151",  null,                                   "Beauty industry",          "",            "",               8},
        {"Nqobile Nokwanda",        "Mngomezulu",     "Female",26, "071 421 4270",  "nqobilenokwanda02@gmail.com",          "Poultry farming",          "",            "",               8},
        {"Ntando",                  "Mntunggwa",      "Male",  32, "060 606 8037",  "nnmawandla@gmail.com",                 "Media Studio",             "",            "",               8},
        {"Ntombenhle",              "Myeni",          "Female",27, "079 775 5698",  "myenintombenhle166@gmail.com",         "Tuck Shop",                "",            "",               8},
        {"Ntombenhle Celimpilo",    "Mngomezulu",     "Female",33, "071 720 7858",  "thononompilo@gmail.com",               "Small Tuck Shop",          "",            "",               8},
        {"Ntombifikile",            "Thabethe",       "Female",26, "064 706 4573",  "Fikiletommythabede@gmail.com",         "Retail Clothing",          "",            "",               8},
        {"Ntombikayise Nonsikelelo","Mbhamali",       "Female",24, "079 217 8986",  null,                                   "Fast food",                "",            "",               8},
        {"Ntombikayise Slindile",   "Fakude",         "Female",23, "067 469 1797",  "ntombikayiseslindilefakude@gmail.com", "Fast food",                "",            "",               8},
        {"Pamella",                 "Thabethe",       "Female",22, "072 924 5804",  "pamellathabethe91@gmail.com",          "Fast food",                "",            "",               8},
        {"Philangenkosi",           "Myeni",          "Male",  19, "076 902 4416",  "philangenkosimyeni8@gmail.com",        "Tuckshop",                 "",            "",               8},
        {"Qiniso",                  "Minenhle",       "Female",28, "063 658 8584",  "qiniso1515@gmail.com",                 "Farming",                  "",            "",               8},
        {"Sabelo",                  "Ntombela",       "Female",34, "071 366 4879",  "sabelontombela11@gmail.com",           "Small Tuck Shop",          "",            "",               8},
        {"Sakhile",                 "Gumede",         "Male",  20, "077 286 7820",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Sandile",                 "Zungu",          "Male",  23, "082 476 9916",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Sandiso Zigi",            "Myeni",          "Male",  21, "082 671 162",   "myenisandisoLuyanda@gmail.com",        "Lawn Mower",               "",            "",               8},
        {"Sanele Nhlonipho",        "Mtshali",        "Female",23, "081 851 2584",  null,                                   "Tuck Shop",                "",            "",               8},
        {"Sbongokuhle",             "Mabika",         "Male",  22, "072 230 4779",  "mabikasbongokuhle@gmail.com",          "Tuckshop",                 "",            "",               8},
        {"Sboniso",                 "Mngomezulu",     "Male",  24, "064 787 4057",  null,                                   "Poultry farming",          "",            "",               8},
        {"Sibikezelo League",       "Manyanga",       "Male",  21, "079 968 870",   "sibekezeloagaya@gmail.com",            "Tuck Shop",                "",            "",               8},
        {"Siboniso Sipho",          "Nkambule",       "Male",  34, "072 432 3668",  null,                                   "Farming & Products",       "",            "",               8},
        {"Sibusiso Nkonzo",         "Myeni",          "Male",  24, "066 465 7408",  "myeninkonzosibusiso@gmail.com",        "Poultry farming",          "",            "",               8},
        {"Sibusiso Siphamandla",    "Dlamini",        "Male",  25, "076 202 2829",  "sphafakude8536@gmail.com",             "Poultry farming",          "",            "",               8},
        {"Silver",                  "Dladla",         "Female",25, "072 294 9054",  "silverdladla00@gmail.com",             "Tuckshop",                 "",            "",               8},
        {"Sindisiwe Mukeliwe",      "Gumede",         "Female",30, "077 297 4192",  "sindisiwegumbi123@gmail.com",          "Salon",                    "",            "",               8},
        {"Sinenhlanhla Nokuthula",  "Myeni",          "Female",28, "079 146 4185",  null,                                   "Fast food",                "",            "",               8},
        {"Siphamandla",             "Mkhwanazi",      "Male",  21, "063 659 3109",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Sisekelo",                "Mkhize",         "Male",  25, "070 442 2419",  "sisekelobrian10@gmail.com",            "Tuck Shop",                "",            "",               8},
        {"Sizakele",                "Dlamini",        "Female",32, "079 869 6998",  null,                                   "Fast food",                "",            "",               8},
        {"Smangele",                "Mhlongo",        "Female",28, "079 824 8342",  "mhlongosmangele249@gmail.com",         "Poultry farming",          "",            "",               8},
        {"Snenhlanhla Nokulunga",   "Vilane",         "Female",30, "076 845 1300",  "vsinenhlanhla430@gmail.com",           "Fast food",                "",            "",               8},
        {"Snethemba",               "Mngomezulu",     "Female",33, "076 509 3844",  null,                                   "Poultry farming",          "",            "",               8},
        {"S'nqobile Nozipho",       "Mthembu",        "Female",21, "060 863 4792",  "Snqobilemthembu60@gmail.com",          "Chicken Business",         "",            "",               8},
        {"Sphelele",                "Fakude",         "Female",28, "082 433 0910",  null,                                   "Clothing boutique",        "",            "",               8},
        {"Sphelele",                "Phoseka",        "Female",22, "060 809 0860",  null,                                   "Makeup artist",            "",            "",               8},
        {"Sphesihle",               "Phoseka",        "Female",22, "066 406 1543",  null,                                   "Beauty salon",             "",            "",               8},
        {"Tallman Ayanda",          "Mthembu",        "Male",  36, "073 501 4252",  "shungwanetrading@gmail.com",           "Farming vegetables",       "",            "",               8},
        {"Thabisile Nobuhle",       "Mngomezulu",     "Female",28, "067 333 6928",  "thabikhuselwa@gmail.com",              "Tuck Shop",                "",            "",               8},
        {"Thabo",                   "Nhlenyama",      "Female",23, "060 854 3261",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Thandeka Thembalethu",    "Myeni",          "Female",22, "071 222 3216",  "myenithandeka6@gmail.com",             "Layer Chicken",            "",            "",               8},
        {"Thembeka Mbali",          "Mazibuko",       "Female",19, "079 817 8677",  "ntombenhlemyeni166@gmail.com",         "Fast food",                "",            "",               8},
        {"Thembeka Mbali",          "Mazibuko",       "Female",19, "071 118 3462",  null,                                   "Tuckshop",                 "",            "",               8},
        {"Thembelihle Nkululeko",   "Mhlanga",        "Female",31, "076 388 5027",  null,                                   "Fast food",                "",            "",               8},
        {"Thobekile",               "Mngomezulu",     "Female",32, "071 574 4239",  "thobekilemngomezulu89@gmail.com",      "Tuckshop",                 "",            "",               8},
        {"Tholokuhle Lungelo",      "Myeni",          "Male",  23, "071 376 6807",  "lungelotholokuhle@gmail.com",          "Poultry farming",          "",            "",               8},
        {"Thulani",                 "Malinga",        "Male",  23, "079 260 3602",  null,                                   "Blocks",                   "",            "",               8},
        {"Velephi Nomusa",          "Sangweni",       "Female",34, "071 155 5164",  "velaphisangweni29@gmail.com",          "Fast food",                "",            "",               8},
        {"Velile Dumsile",          "Simelane",       "Female",21, "068 686 9669",  "veliledumsile@gmail.com",              "Fast food",                "",            "",               8},
        {"Velile Ncamsile",         "Ntshangase",     "Female",31, "072 852 4449",  "velilevee112@gmail.com",               "Fast food",                "",            "",               8},
        {"William",                 "Ngcobo",         "Male",  24, "060 623 2997",  "william1040ngcobo@gmail.com",          "Tuckshop",                 "",            "",               8},
        {"Xolile",                  "Mngomezulu",     "Female",25, "071 477 7705",  null,                                   "Weaves",                   "",            "",               8},
        {"Xolile Malibongwe",       "Fakude",         "Female",null,"064 850 0169", null,                                   "Bakery",                   "",            "",               8},
        {"Zandile",                 "Mthembu",        "Female",27, "072 787 4500",  null,                                   "Tuck Shop",                "",            "",               8},
        {"Zandisile",               "Nhlengethwa",    "Female",27, "082 261 3578",  "zandisilezandisile377@gmail.com",      "Bakery",                   "",            "",               8},
        {"Zanele",                  "Mngomezulu",     "Female",29, "079 057 2190",  "zanelemngomezulu@gmail.com",           "Tuckshop",                 "",            "",               8},
        {"Zinhle Mbali",            "Myeni",          "Female",29, "072 476 7984",  "ZM9462689@gmail.com",                  "Tuckshop",                 "",            "",               8},
        {"Zinhle Nontethelelo",     "Mkhumbuzi",      "Female",33, "079 383 8872",  "ntehntetheh3@gmail.com",               "Poultry farming",          "",            "",               8},
    };

    private void seedKwaNgwenyaApplicants() {
        Community kwaNgwenya = communityRepository.findByNameIgnoreCase("KwaNgwenya")
                .orElse(null);
        if (kwaNgwenya == null) return;

        // Only seed if this community has no applicants yet
        if (!applicantRepository.findByCommunityId(kwaNgwenya.getId()).isEmpty()) return;

        OffsetDateTime now = OffsetDateTime.now();

        for (Object[] row : KWANGWENYA_DATA) {
            String firstName  = (String)  row[0];
            String lastName   = (String)  row[1];
            String gender     = (String)  row[2];
            Integer age       = (Integer) row[3];
            String phone      = (String)  row[4];
            String email      = (String)  row[5];
            String hustle     = (String)  row[6];
            String rawCall    = (String)  row[7];
            String district   = (String)  row[8];
            int cohort        = (int)     row[9];

            // Map call status
            CallStatus callStatus;
            PipelineStage stage;
            switch (rawCall.trim().toLowerCase()) {
                case "yes" -> { callStatus = CallStatus.REACHED;    stage = PipelineStage.CALLING;   }
                case "missed call" -> { callStatus = CallStatus.MISSED_CALL; stage = PipelineStage.CALLING; }
                case "voicemail", "voice mail" -> { callStatus = CallStatus.VOICEMAIL; stage = PipelineStage.CALLING; }
                default -> { callStatus = CallStatus.NOT_CALLED; stage = PipelineStage.CAPTURED; }
            }

            boolean ageFlag = age != null && (age < 18 || age > 35);

            applicantRepository.save(Applicant.builder()
                    .community(kwaNgwenya)
                    .cohortNumber(cohort)
                    .firstName(firstName)
                    .lastName(lastName)
                    .gender(gender)
                    .age(age)
                    .phone(phone)
                    .email(email)
                    .typeOfHustle(hustle)
                    .districtSection(district.isBlank() ? null : district)
                    .pipelineStage(stage)
                    .callStatus(callStatus)
                    .ageFlag(ageFlag)
                    .capturedBy("Sandile Mathenjwa")
                    .createdAt(now)
                    .build());
        }
    }
}
