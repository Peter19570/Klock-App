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

@Component
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AutoClockOut {

    private final ClockEventRepo clockEventRepo;
    private final WorkSessionRepo workSessionRepo;

    @Scheduled(fixedRate = 50000)
    public void autoClockOutAfterBranchEndShiftTime() {
        // 1. Use findByStatus without forcing a throw
        var sessionOptional = workSessionRepo.findByStatus(SessionStatus.ACTIVE);

        if (sessionOptional.isEmpty()) {
//            log.info("No active session found in db");
            return; // Exit gracefully
        }

        WorkSession session = sessionOptional.get();

        // 2. Continue with your logic
        clockEventRepo.findByClockOutTimeIsNullAndWorkSession(session)
                .ifPresent(clockEvent -> {
                    if (LocalTime.now().isAfter(clockEvent.getBranch().getShiftEnd())) {
                        clockEvent.setClockOutTime(Instant.now());
                        clockEvent.setClockOutType(ClockOutType.AUTOMATIC);
                        session.setStatus(SessionStatus.COMPLETED);

                        // Don't forget to save!
                        workSessionRepo.save(session);
                        clockEventRepo.save(clockEvent);
                    }
                });
    }
}
