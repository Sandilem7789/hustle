package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "monthly_check_ins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyCheckIn {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_profile_id", nullable = false)
    private BusinessProfile businessProfile;

    // Format: "YYYY-MM" e.g. "2026-04"
    @Column(nullable = false)
    private String visitMonth;

    @ElementCollection
    @CollectionTable(name = "check_in_photos", joinColumns = @JoinColumn(name = "check_in_id"))
    @Column(name = "photo_url")
    private List<String> photoUrls;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private String visitedBy;

    @Column(nullable = false)
    private OffsetDateTime createdAt;
}
