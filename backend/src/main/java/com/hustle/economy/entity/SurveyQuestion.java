package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "survey_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SurveyQuestion {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private SurveyTemplate template;

    @Column(nullable = false)
    private int orderIndex;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String questionText;

    // Stable machine key — must never change once set, even if questionText is edited.
    @Column(nullable = false)
    private String fieldKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SurveyQuestionType questionType;

    // JSON array of option labels, only used for SINGLE_CHOICE / MULTI_CHOICE
    @Column(columnDefinition = "TEXT")
    private String options;

    @Column(nullable = false)
    private boolean required;

    @Column(columnDefinition = "TEXT")
    private String helpText;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean active;
}
