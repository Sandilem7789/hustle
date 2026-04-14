package com.hustle.economy.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class MonthlyCheckInRequest {
    private String notes;
    private List<String> photoUrls;
    private String visitedBy;
}
