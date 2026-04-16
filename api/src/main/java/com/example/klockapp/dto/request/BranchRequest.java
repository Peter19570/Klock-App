package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BranchRequest(
        @NotBlank String displayName,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double radius,
        Long autoClockOutDuration
) {}