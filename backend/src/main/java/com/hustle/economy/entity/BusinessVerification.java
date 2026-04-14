package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "business_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessVerification {

    @Id
    @GeneratedValue
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "applicant_id", unique = true, nullable = false)
    private Applicant applicant;

    private LocalDate visitDate;

    // GPS coordinates of the business location
    private Double latitude;
    private Double longitude;

    // Photos: list of upload URLs
    @ElementCollection
    @CollectionTable(name = "verification_photos", joinColumns = @JoinColumn(name = "verification_id"))
    @Column(name = "photo_url")
    private List<String> photoUrls;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    private VerificationOutcome outcome;

    private String verifiedBy;

    @Column(nullable = false)
    private OffsetDateTime createdAt;

    private OffsetDateTime updatedAt;
}
