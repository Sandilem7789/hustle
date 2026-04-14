package com.hustle.economy.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Builder
public class ApplicantResponse {

    private UUID id;
    private String communityId;
    private String communityName;
    private Integer cohortNumber;
    private String firstName;
    private String lastName;
    private String gender;
    private Integer age;
    private String phone;
    private String email;
    private String typeOfHustle;
    private String districtSection;
    private String pipelineStage;
    private String callStatus;
    private boolean ageFlag;
    private String capturedBy;
    private String rejectionReason;
    private long approvedCountInCohort;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private OffsetDateTime activatedAt;
}
