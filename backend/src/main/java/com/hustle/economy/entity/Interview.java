package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "interviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interview {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_id", unique = true, nullable = false)
    private Applicant applicant;

    // Set by coordinator when scheduling
    private LocalDate scheduledDate;

    // Set by facilitator when recording outcome
    private LocalDate conductedDate;

    // Evaluation criteria
    private Boolean canDescribeBusiness;
    private Boolean appearsGenuine;
    private Boolean hasRunningBusiness;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    private InterviewOutcome outcome;

    private String conductedBy;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}
