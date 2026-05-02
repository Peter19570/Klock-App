package com.example.klockapp.dto.response;

import com.example.klockapp.enums.BranchStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.List;

public record BranchDetailsResponse(
        Long id,
        String displayName,
        Double radius,
        BranchStatus branchStatus,
        Long autoClockOutDuration,
        Double latitude,
        Double longitude,
        LocalTime shiftStart,
        LocalTime shiftEnd,
        Double avgDistance,
        double displayAvg,
        String status,
        String support,

        // Admins to specified branch
        List<UserResponse> admins,

        // Summary Stats
        long totalAssignedStaff,
        long currentActiveCount,

        // The Lists
        List<UserResponse> assignedStaff, // People whose homeBranch is this
        List<UserResponse> activeNow      // People physically at this branch right now
) {}
