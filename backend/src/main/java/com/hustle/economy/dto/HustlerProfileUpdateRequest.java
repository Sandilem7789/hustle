package com.hustle.economy.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class HustlerProfileUpdateRequest {
    private String description;
    private String targetCustomers;
    private String vision;
    private String mission;
    private String operatingArea;
    private String communityId;
}
