package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "applicants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Applicant {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id", nullable = false)
    private Community community;

    // Cohort number within the community (1, 2, etc.)
    @Column(nullable = false)
    private Integer cohortNumber;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String gender;

    private Integer age;

    @Column(nullable = false)
    private String phone;

    private String email;

    @Column(nullable = false)
    private String typeOfHustle;

    // Sub-area within the community (district/section)
    private String districtSection;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PipelineStage pipelineStage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CallStatus callStatus;

    // True if age is outside 18-35
    @Column(nullable = false)
    private boolean ageFlag;

    // Name of facilitator who captured this applicant
    private String capturedBy;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;

    private String rejectionReason;

    // Set when a Hustler account is created from this applicant
    private OffsetDateTime activatedAt;
}
