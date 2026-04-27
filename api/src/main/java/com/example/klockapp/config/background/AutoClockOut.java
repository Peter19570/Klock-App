package com.example.klockapp.config.background;

import com.example.klockapp.enums.ClockOutType;
import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.model.ClockEvent;
import com.example.klockapp.model.WorkSession;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.WorkSessionRepo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AutoClockOut {

    private final ClockEventRepo clockEventRepo;
    private final WorkSessionRepo workSessionRepo;

    @Scheduled(fixedRate = 50000)
    public void autoClockOutAfterBranchEndShiftTime() {
        // 1. Fetch all active sessions as a List
        List<WorkSession> activeSessions = workSessionRepo.findByStatus(SessionStatus.ACTIVE);

        if (activeSessions.isEmpty()) {
            return; // Exit gracefully if no sessions are active
        }

        // 2. Iterate through each session to check for clock-outs
        for (WorkSession session : activeSessions) {
            clockEventRepo.findByClockOutTimeIsNullAndWorkSession(session)
                    .ifPresent(clockEvent -> {
                        // Check if current time is past the branch shift end
                        if (LocalTime.now().isAfter(clockEvent.getBranch().getShiftEnd())) {
                            clockEvent.setClockOutTime(Instant.now());
                            clockEvent.setClockOutType(ClockOutType.AUTOMATIC);

                            session.setStatus(SessionStatus.COMPLETED);

                            // Save both changes
                            workSessionRepo.save(session);
                            clockEventRepo.save(clockEvent);
                        }
                    });
        }
    }
}
