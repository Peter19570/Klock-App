package com.example.klockapp.dto.response.record;

import com.example.klockapp.enums.BranchStatus;

import java.util.List;

public record BranchDetailsResponse(
        Long id,
        String displayName,
        Double radius,
        BranchStatus branchStatus,
        Double latitude,
        Double longitude,

        // Summary Stats
        long totalAssignedStaff,
        long currentActiveCount,

        // The Lists
        List<UserResponse> assignedStaff, // People whose homeBranch is this
        List<UserResponse> activeNow      // People physically at this branch right now [cite: 25, 29]
) {}
