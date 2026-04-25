package com.example.klockapp.dto.response;

import com.example.klockapp.enums.BranchStatus;

import java.time.LocalTime;

public record BranchResponse(
        Long id,
        String displayName,
        Double latitude,
        Double longitude,
        Double radius,
        BranchStatus branchStatus,
        LocalTime shiftStart,
        LocalTime shiftEnd
) {}
