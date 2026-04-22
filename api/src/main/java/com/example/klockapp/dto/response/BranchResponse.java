package com.example.klockapp.dto.response;

import com.example.klockapp.enums.BranchStatus;

import java.time.Instant;
import java.time.LocalTime;

public record BranchResponse(
        Long id,
        String displayName,
        Double radius,
        BranchStatus branchStatus,
        LocalTime startShift,
        LocalTime endShift
) {}
