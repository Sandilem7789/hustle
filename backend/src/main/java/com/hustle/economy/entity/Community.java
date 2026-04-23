package com.hustle.economy.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "communities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Community {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    private String province;
    private String region;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Double latitude;
    private Double longitude;
}
