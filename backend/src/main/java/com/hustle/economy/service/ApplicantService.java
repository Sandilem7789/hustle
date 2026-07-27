package com.hustle.economy.service;

import com.hustle.economy.dto.ActivateApplicantResponse;
import com.hustle.economy.dto.ApplicantRequest;
import com.hustle.economy.dto.ApplicantResponse;
import com.hustle.economy.dto.CohortCapResponse;
import com.hustle.economy.dto.HustlerDecisionRequest;
import com.hustle.economy.entity.*;
import com.hustle.economy.repository.AppUserRepository;
import com.hustle.economy.repository.ApplicantRepository;
import com.hustle.economy.repository.BusinessProfileRepository;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.HustlerApplicationRepository;
import com.hustle.economy.util.PhoneUtils;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ApplicantService {

    private static final int COHORT_CAP = 30;
    private static final String PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int PASSWORD_LENGTH = 8;

    // Applicant registered via the app before being captured/activated in the facilitator pipeline —
    // they already have a working password, so activate() must not overwrite or duplicate it.
    private static final String CREDENTIALS_MODE_EXISTING_ACCOUNT = "EXISTING_ACCOUNT";
    // A brand-new password was generated for a true paper applicant (no smartphone / no app account).
    private static final String CREDENTIALS_MODE_GENERATED = "GENERATED";

    private final ApplicantRepository applicantRepository;
    private final CommunityRepository communityRepository;
    private final HustlerApplicationRepository applicationRepository;
    private final BusinessProfileRepository businessProfileRepository;
    private final AppUserRepository appUserRepository;
    private final HustlerApplicationService hustlerApplicationService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public ApplicantResponse create(ApplicantRequest request) {
        Community community = communityRepository.findById(UUID.fromString(request.getCommunityId()))
                .orElseThrow(() -> new EntityNotFoundException("Community not found"));

        int cohort = request.getCohortNumber() != null ? request.getCohortNumber() : 1;
        Integer age = request.getAge();
        boolean ageFlag = age == null || age < 18 || age > 35;

        Applicant applicant = Applicant.builder()
                .community(community)
                .cohortNumber(cohort)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .gender(request.getGender())
                .age(age)
                .phone(request.getPhone())
                .email(request.getEmail())
                .typeOfHustle(request.getTypeOfHustle())
                .districtSection(request.getDistrictSection())
                .pipelineStage(PipelineStage.CAPTURED)
                .callStatus(CallStatus.NOT_CALLED)
                .ageFlag(ageFlag)
                .capturedBy(request.getCapturedBy())
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        return toResponse(applicantRepository.save(applicant));
    }

    @Transactional(readOnly = true)
    public List<ApplicantResponse> list(String communityId, String stage, String callStatus) {
        List<Applicant> results;

        if (communityId != null && !communityId.isBlank()) {
            UUID cid = UUID.fromString(communityId);
            if (stage != null && !stage.isBlank()) {
                results = applicantRepository.findByCommunityIdAndStage(cid, PipelineStage.valueOf(stage.toUpperCase()));
            } else if (callStatus != null && !callStatus.isBlank()) {
                results = applicantRepository.findByCommunityIdAndCallStatus(cid, CallStatus.valueOf(callStatus.toUpperCase()));
            } else {
                results = applicantRepository.findByCommunityId(cid);
            }
        } else if (stage != null && !stage.isBlank()) {
            results = applicantRepository.findByStage(PipelineStage.valueOf(stage.toUpperCase()));
        } else {
            results = applicantRepository.findAllFetched();
        }

        return results.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ApplicantResponse getById(UUID id) {
        Applicant applicant = applicantRepository.findByIdFetched(id)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));
        return toResponse(applicant);
    }

    @Transactional
    public ApplicantResponse updateCallStatus(UUID id, String callStatus) {
        Applicant applicant = applicantRepository.findByIdFetched(id)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        applicant.setCallStatus(CallStatus.valueOf(callStatus.toUpperCase()));

        // Advance stage to CALLING once any call attempt is recorded
        if (applicant.getPipelineStage() == PipelineStage.CAPTURED) {
            applicant.setPipelineStage(PipelineStage.CALLING);
        }

        applicant.setUpdatedAt(OffsetDateTime.now());
        return toResponse(applicantRepository.save(applicant));
    }

    @Transactional
    public ApplicantResponse updateStage(UUID id, String stage, String rejectionReason) {
        Applicant applicant = applicantRepository.findByIdFetched(id)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        PipelineStage newStage = PipelineStage.valueOf(stage.toUpperCase());

        if (newStage == PipelineStage.APPROVED) {
            long approvedCount = applicantRepository.countApproved(
                    applicant.getCommunity().getId(), applicant.getCohortNumber());
            if (approvedCount >= COHORT_CAP) {
                throw new IllegalStateException(
                        "Cohort " + applicant.getCohortNumber() + " in " +
                        applicant.getCommunity().getName() + " has reached the cap of " + COHORT_CAP + " hustlers.");
            }
        }

        applicant.setPipelineStage(newStage);
        if (newStage == PipelineStage.REJECTED) {
            applicant.setRejectionReason(rejectionReason);
        } else {
            // Clear reason when reinstating
            applicant.setRejectionReason(null);
        }
        applicant.setUpdatedAt(OffsetDateTime.now());
        return toResponse(applicantRepository.save(applicant));
    }

    @Transactional(readOnly = true)
    public CohortCapResponse getCapStatus(UUID communityId, int cohortNumber) {
        Community community = communityRepository.findById(communityId)
                .orElseThrow(() -> new EntityNotFoundException("Community not found"));

        long approvedCount = applicantRepository.countApproved(communityId, cohortNumber);

        return CohortCapResponse.builder()
                .communityId(communityId)
                .communityName(community.getName())
                .cohortNumber(cohortNumber)
                .approvedCount(approvedCount)
                .cap(COHORT_CAP)
                .atCap(approvedCount >= COHORT_CAP)
                .build();
    }

    @Transactional
    public ActivateApplicantResponse activate(UUID applicantId) {
        Applicant applicant = applicantRepository.findByIdFetched(applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        if (applicant.getPipelineStage() != PipelineStage.APPROVED) {
            throw new IllegalStateException("Applicant must be in APPROVED stage before activation.");
        }
        if (applicant.getActivatedAt() != null) {
            throw new IllegalStateException("This applicant already has an account.");
        }

        String phone = PhoneUtils.normalize(applicant.getPhone());
        Optional<AppUser> existingUser = appUserRepository.findByPhone(phone);
        Optional<HustlerApplication> existingApplication = applicationRepository.findFirstByPhoneOrderBySubmittedAtDesc(phone);

        ActivateApplicantResponse response = existingUser.isPresent()
                ? activateExistingAccount(applicant, phone, existingUser.get(), existingApplication)
                : activateWithGeneratedPassword(applicant, phone, existingApplication);

        applicant.setActivatedAt(OffsetDateTime.now());
        applicantRepository.save(applicant);

        return response;
    }

    // Applicant already registered in the app under this phone — approve/link their existing
    // account rather than generating a password nobody will ever use to log in.
    private ActivateApplicantResponse activateExistingAccount(Applicant applicant, String phone,
                                                                AppUser appUser,
                                                                Optional<HustlerApplication> existingApplication) {
        HustlerApplication application = existingApplication.orElseGet(() -> applicationRepository.save(
                HustlerApplication.builder()
                        .firstName(applicant.getFirstName())
                        .lastName(applicant.getLastName())
                        .phone(phone)
                        .email(applicant.getEmail())
                        .community(applicant.getCommunity())
                        .businessName(applicant.getFirstName() + " " + applicant.getLastName())
                        .businessType(applicant.getTypeOfHustle())
                        .description("")
                        .operatingArea(applicant.getDistrictSection())
                        .status(ApplicationStatus.PENDING)
                        .passwordHash(appUser.getPasswordHash())
                        .appUser(appUser)
                        .submittedAt(OffsetDateTime.now())
                        .build()));

        if (application.getAppUser() == null) {
            application.setAppUser(appUser);
            application = applicationRepository.save(application);
        }

        HustlerDecisionRequest decision = new HustlerDecisionRequest();
        decision.setStatus("APPROVED");
        application = hustlerApplicationService.decide(application.getId(), decision);

        BusinessProfile profile = businessProfileRepository.findByApplication_Id(application.getId())
                .orElseThrow(() -> new EntityNotFoundException("Business profile not found after approval"));

        return ActivateApplicantResponse.builder()
                .applicantId(applicant.getId())
                .applicationId(application.getId())
                .businessProfileId(profile.getId())
                .firstName(applicant.getFirstName())
                .lastName(applicant.getLastName())
                .phone(applicant.getPhone())
                .generatedPassword(null)
                .credentialsMode(CREDENTIALS_MODE_EXISTING_ACCOUNT)
                .build();
    }

    // True paper applicant (no app account) — generate credentials as before, but reuse an
    // existing HustlerApplication for this phone instead of creating a duplicate.
    private ActivateApplicantResponse activateWithGeneratedPassword(Applicant applicant, String phone,
                                                                       Optional<HustlerApplication> existingApplication) {
        String plainPassword = generatePassword();
        String passwordHash = passwordEncoder.encode(plainPassword);

        HustlerApplication application;
        if (existingApplication.isPresent()) {
            application = existingApplication.get();
            application.setStatus(ApplicationStatus.APPROVED);
            application.setDecidedAt(OffsetDateTime.now());
            application.setPasswordHash(passwordHash);
            application = applicationRepository.save(application);
        } else {
            application = applicationRepository.save(HustlerApplication.builder()
                    .firstName(applicant.getFirstName())
                    .lastName(applicant.getLastName())
                    .phone(phone)
                    .email(applicant.getEmail())
                    .community(applicant.getCommunity())
                    .businessName(applicant.getFirstName() + " " + applicant.getLastName())
                    .businessType(applicant.getTypeOfHustle())
                    .description("")
                    .operatingArea(applicant.getDistrictSection())
                    .status(ApplicationStatus.APPROVED)
                    .passwordHash(passwordHash)
                    .submittedAt(OffsetDateTime.now())
                    .decidedAt(OffsetDateTime.now())
                    .build());
        }

        BusinessProfile profile = upsertBusinessProfile(application, applicant);

        return ActivateApplicantResponse.builder()
                .applicantId(applicant.getId())
                .applicationId(application.getId())
                .businessProfileId(profile.getId())
                .firstName(applicant.getFirstName())
                .lastName(applicant.getLastName())
                .phone(applicant.getPhone())
                .generatedPassword(plainPassword)
                .credentialsMode(CREDENTIALS_MODE_GENERATED)
                .build();
    }

    private BusinessProfile upsertBusinessProfile(HustlerApplication application, Applicant applicant) {
        return businessProfileRepository.findByApplication_Id(application.getId())
                .map(profile -> {
                    profile.setBusinessName(application.getBusinessName());
                    profile.setBusinessType(application.getBusinessType());
                    profile.setOperatingArea(applicant.getDistrictSection());
                    profile.setStatus(ApplicationStatus.APPROVED);
                    profile.setUpdatedAt(OffsetDateTime.now());
                    return businessProfileRepository.save(profile);
                })
                .orElseGet(() -> businessProfileRepository.save(BusinessProfile.builder()
                        .application(application)
                        .community(applicant.getCommunity())
                        .businessName(application.getBusinessName())
                        .businessType(application.getBusinessType())
                        .description("")
                        .operatingArea(applicant.getDistrictSection())
                        .status(ApplicationStatus.APPROVED)
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build()));
    }

    private String generatePassword() {
        // Generate a readable random password (no 0/O/1/I/l ambiguity)
        StringBuilder pwd = new StringBuilder(PASSWORD_LENGTH);
        for (int i = 0; i < PASSWORD_LENGTH; i++) {
            pwd.append(PASSWORD_CHARS.charAt(secureRandom.nextInt(PASSWORD_CHARS.length())));
        }
        return pwd.toString();
    }

    @Transactional
    public ActivateApplicantResponse resetPassword(UUID applicantId) {
        Applicant applicant = applicantRepository.findByIdFetched(applicantId)
                .orElseThrow(() -> new EntityNotFoundException("Applicant not found"));

        if (applicant.getActivatedAt() == null) {
            throw new IllegalStateException("This applicant does not have an account yet.");
        }

        String phone = PhoneUtils.normalize(applicant.getPhone());
        Optional<AppUser> appUserOpt = appUserRepository.findByPhone(phone);
        Optional<HustlerApplication> applicationOpt = applicationRepository.findFirstByPhoneOrderBySubmittedAtDesc(phone);

        if (appUserOpt.isEmpty() && applicationOpt.isEmpty()) {
            throw new EntityNotFoundException("Hustler account not found.");
        }

        String plainPassword = generatePassword();
        String passwordHash = passwordEncoder.encode(plainPassword);

        // Login always checks AppUser first, so that hash — not the HustlerApplication's — is
        // what actually gates access once an AppUser exists for this phone.
        appUserOpt.ifPresent(user -> {
            user.setPasswordHash(passwordHash);
            appUserRepository.save(user);
        });
        applicationOpt.ifPresent(application -> {
            application.setPasswordHash(passwordHash);
            applicationRepository.save(application);
        });

        return ActivateApplicantResponse.builder()
                .applicantId(applicant.getId())
                .applicationId(applicationOpt.map(HustlerApplication::getId).orElse(null))
                .businessProfileId(null)
                .firstName(applicant.getFirstName())
                .lastName(applicant.getLastName())
                .phone(applicant.getPhone())
                .generatedPassword(plainPassword)
                .credentialsMode(CREDENTIALS_MODE_GENERATED)
                .build();
    }

    private ApplicantResponse toResponse(Applicant a) {
        long approvedCount = applicantRepository.countApproved(
                a.getCommunity().getId(), a.getCohortNumber());

        return ApplicantResponse.builder()
                .id(a.getId())
                .communityId(a.getCommunity().getId().toString())
                .communityName(a.getCommunity().getName())
                .cohortNumber(a.getCohortNumber())
                .firstName(a.getFirstName())
                .lastName(a.getLastName())
                .gender(a.getGender())
                .age(a.getAge())
                .phone(a.getPhone())
                .email(a.getEmail())
                .typeOfHustle(a.getTypeOfHustle())
                .districtSection(a.getDistrictSection())
                .pipelineStage(a.getPipelineStage().name())
                .callStatus(a.getCallStatus().name())
                .ageFlag(a.isAgeFlag())
                .capturedBy(a.getCapturedBy())
                .rejectionReason(a.getRejectionReason())
                .approvedCountInCohort(approvedCount)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .activatedAt(a.getActivatedAt())
                .build();
    }
}
