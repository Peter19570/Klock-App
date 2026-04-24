package com.example.klockapp.repo;

import com.example.klockapp.model.ClockEvent;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClockEventRepo extends JpaRepository<ClockEvent, Long>, JpaSpecificationExecutor<ClockEvent> {

    // Guardrail: Check if a user has an open event anywhere in the system [cite: 50, 51]
    boolean existsByWorkSessionUserAndClockOutTimeIsNull(User user);

    // Finds the active movement to perform a clock-out [cite: 9, 51]
    Optional<ClockEvent> findByWorkSessionUserAndClockOutTimeIsNull(User user);

    // Dashboard logic: Find everyone physically present at a branch right now [cite: 13, 52]
    List<ClockEvent> findAllByBranchIdAndClockOutTimeIsNull(Long branchId);

    // History: Finds all movements within a single workday container [cite: 9, 49]
    List<ClockEvent> findAllByWorkSessionIdOrderByClockInTimeAsc(Long workSessionId);

    Optional<ClockEvent> findByClockOutTimeIsNullAndWorkSession(WorkSession workSession);
}
