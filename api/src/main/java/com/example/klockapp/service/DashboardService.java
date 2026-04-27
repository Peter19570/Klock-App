package com.example.klockapp.service;

import com.example.klockapp.dto.response.BranchResponse;
import com.example.klockapp.dto.response.DashboardResponse;
import com.example.klockapp.enums.BranchStatus;
import com.example.klockapp.enums.ClockOutType;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.model.Branch;
import com.example.klockapp.repo.BranchRepo;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.UserRepo;
import com.example.klockapp.repo.WorkSessionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepo userRepo;
    private final WorkSessionRepo workSessionRepo;
    private final ClockEventRepo clockEventRepo;
    private final BranchRepo branchRepo;

    @Transactional(readOnly = true)
    public DashboardResponse getAdminDashboard() {
        LocalDate today = LocalDate.now();
        Instant startOfToday = today.atStartOfDay(ZoneId.systemDefault()).toInstant();

        // 1. High-level aggregates
        long totalUsers = userRepo.countByRole(UserRole.USER);
        long todaySessions = workSessionRepo.countByWorkDate(today);

        // 2. Clock Out Stats (Manual vs Auto)
        var clockOutMap = clockEventRepo.getTodayClockOutStats(startOfToday)
                .stream()
                .collect(Collectors.toMap(
                        row -> (ClockOutType) row[0],
                        row -> (Long) row[1],
                        (a, b) -> a
                ));

        var stats = new DashboardResponse.ClockOutStats(
                clockOutMap.getOrDefault(ClockOutType.MANUAL, 0L),
                clockOutMap.getOrDefault(ClockOutType.AUTOMATIC, 0L)
        );

        // 3. Last 7 Days Trend (with zero-filling)
        List<DashboardResponse.SessionTrend> trend = getLast7DaysTrend();

        // 4. Branch Summaries Mapping
        List<Branch> allBranches = branchRepo.findAll();

        // Map of Branch ID -> Count of people currently clocked in
        var activeCountsMap = clockEventRepo.getAllCurrentActiveCounts()
                .stream().collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        List<BranchResponse> branchSummaries = new ArrayList<>();
        long totalAssignedGlobal = 0;
        long totalActiveGlobal = 0;
        long lockedCount = 0;

        for (Branch b : allBranches) {
            // Count assigned via the relationship defined in your User entity
            int assignedCount = b.getAssignedStaff().size();
            int activeCount = activeCountsMap.getOrDefault(b.getId(), 0L).intValue();

            totalAssignedGlobal += assignedCount;
            totalActiveGlobal += activeCount;
            if (b.getBranchStatus() == BranchStatus.LOCKED) lockedCount++;

            branchSummaries.add(new BranchResponse(
                    b.getId(),
                    b.getDisplayName(),
                    b.getRadius(),
                    b.getLatitude(),
                    b.getLongitude(),
                    b.getBranchStatus(),
                    b.getAutoClockOutDuration(),
                    b.getShiftStart(),
                    b.getShiftEnd(),
                    assignedCount, // Added to match your summary needs
                    activeCount    // Added to match your summary needs
            ));
        }

        return new DashboardResponse(
                totalUsers,
                todaySessions,
                stats,
                trend,
                branchSummaries,
                totalAssignedGlobal,
                totalActiveGlobal,
                lockedCount
        );
    }

    private List<DashboardResponse.SessionTrend> getLast7DaysTrend() {
        LocalDate sevenDaysAgo = LocalDate.now().minusDays(6);
        var dbData = workSessionRepo.getSessionTrendData(sevenDaysAgo)
                .stream().collect(Collectors.toMap(
                        row -> (LocalDate) row[0],
                        row -> ((Long) row[1]).intValue()
                ));

        List<DashboardResponse.SessionTrend> fullTrend = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = sevenDaysAgo.plusDays(i);
            fullTrend.add(new DashboardResponse.SessionTrend(
                    date.toString(),
                    date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                    dbData.getOrDefault(date, 0)
            ));
        }
        return fullTrend;
    }
}
