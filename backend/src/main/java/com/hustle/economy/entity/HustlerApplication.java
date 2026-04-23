package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "hustler_applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HustlerApplication {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String email;
    private String phone;
    private String idNumber;
    private String passwordHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "community_id")
    private Community community;

    @Column(nullable = false)
    private String businessName;

    @Column(nullable = false)
    private String businessType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String vision;

    @Column(columnDefinition = "TEXT")
    private String mission;

    @Column(columnDefinition = "TEXT")
    private String targetCustomers;

    private String operatingArea;

    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column
    private UserRole role = UserRole.HUSTLER;

    @Column(columnDefinition = "TEXT")
    private String facilitatorNotes;

    @Column(nullable = false)
    private OffsetDateTime submittedAt;

    private OffsetDateTime decidedAt;
}
