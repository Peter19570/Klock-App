package com.example.klockapp.repo;

import com.example.klockapp.model.ClockEvent;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClockEventRepo extends JpaRepository<ClockEvent, Long>, JpaSpecificationExecutor<ClockEvent> {

    // Guardrail: Check if a user has an open event anywhere in the system [cite: 50, 51]
    boolean existsByWorkSessionUserAndClockOutTimeIsNull(User user);

    // Finds the active movement to perform a clock-out [cite: 9, 51]
    Optional<ClockEvent> findByWorkSessionUserAndClockOutTimeIsNull(User user);

    Optional<ClockEvent> findByClockOutTimeIsNullAndWorkSession(WorkSession workSession);

    // Dashboard logic: Find everyone physically present at a branch right now [cite: 13, 52]
    List<ClockEvent> findAllByBranchIdAndClockOutTimeIsNull(Long branchId);

    // History: Finds all movements within a single workday container [cite: 9, 49]
    List<ClockEvent> findAllByWorkSessionIdOrderByClockInTimeAsc(Long workSessionId);

    @Query("SELECT AVG(ce.entryProximityDistance) FROM ClockEvent ce " +
            "WHERE ce.branch.id = :branchId " +
            "AND ce.entryProximityDistance IS NOT NULL")
    Double getAverageClockInDistanceForBranch(@Param("branchId") Long branchId);

    @Query("SELECT ce.clockOutType, COUNT(ce) FROM ClockEvent ce " +
            "WHERE ce.clockOutTime IS NOT NULL AND ce.clockInTime >= :startOfDay " +
            "GROUP BY ce.clockOutType")
    List<Object[]> getTodayClockOutStats(@Param("startOfDay") Instant startOfDay);

    // Optimized: Gets current active count for ALL branches in one go
    @Query("SELECT ce.branch.id, COUNT(ce) FROM ClockEvent ce " +
            "WHERE ce.clockOutTime IS NULL GROUP BY ce.branch.id")
    List<Object[]> getAllCurrentActiveCounts();
}
