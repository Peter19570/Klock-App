package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalTime;

public record BranchRequest(
        @NotBlank String displayName,
        @NotNull Double latitude,
        @NotNull Double longitude,
        @NotNull Double radius,
        Long autoClockOutDuration,
        @NotNull LocalTime startShift,
        @NotNull LocalTime endShift
) {}