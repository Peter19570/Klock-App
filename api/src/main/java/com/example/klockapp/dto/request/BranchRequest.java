package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record BranchRequest(
        String displayName,
        Double latitude,
        Double longitude,
        Double radius,
        Long autoClockOutDuration,
        LocalTime shiftStart,
        LocalTime shiftEnd,
        String support
) {}
