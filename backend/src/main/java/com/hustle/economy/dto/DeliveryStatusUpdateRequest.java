package com.hustle.economy.dto;

import com.hustle.economy.entity.JobStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryStatusUpdateRequest {
    @NotNull
    private JobStatus status;

    private String proofPhotoUrl;
}
