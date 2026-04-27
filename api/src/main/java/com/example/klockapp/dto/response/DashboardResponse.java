package com.example.klockapp.dto.response;

import com.example.klockapp.enums.BranchStatus;

import java.util.List;

public record DashboardResponse(
        long totalUsers,
        long todaySessionCount,
        ClockOutStats clockOutStats,
        List<SessionTrend> sessionTrend,
        List<BranchResponse> branchSummaries,
        long totalAssignedStaff,
        long totalActiveStaff,
        long lockedBranchCount
) {
    // Nested records for the sub-structures

    public record ClockOutStats(
            long manual,
            long automatic
    ) {}

    public record SessionTrend(
            String date,      // "yyyy-MM-dd"
            String dayLabel,  // "Mon", "Tue"
            int count
    ) {}
}
