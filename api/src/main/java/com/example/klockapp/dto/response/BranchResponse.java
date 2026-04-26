package com.example.klockapp.dto.response;

import com.example.klockapp.enums.BranchStatus;

import java.time.LocalTime;

public record BranchResponse(
        Long id,
        String displayName,
        Double radius,
        Double latitude,
        Double longitude,
        BranchStatus branchStatus,
        Long autoClockOutDuration,
        LocalTime shiftStart,
        LocalTime shiftEnd
) {}
