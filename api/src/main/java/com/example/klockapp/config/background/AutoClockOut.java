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

import java.time.Instant;
import java.time.LocalTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class AutoClockOut {

    private final ClockEventRepo clockEventRepo;
    private final WorkSessionRepo workSessionRepo;

    @Scheduled(fixedRate = 50000)
    public void autoClockOutAfterBranchEndShiftTime(){
        WorkSession session = workSessionRepo.findByStatus(SessionStatus.ACTIVE)
                .orElseThrow(() -> {
                    log.info("No active session found in db");
                    return null;
                });

        ClockEvent clockEvent = clockEventRepo.findByClockOutTimeIsNullAndWorkSession(session)
                .orElse(null);

        if (clockEvent != null){
            if (LocalTime.now().isAfter(clockEvent.getBranch().getShiftEnd())){
                clockEvent.setClockOutTime(Instant.now());
                clockEvent.setClockOutType(ClockOutType.AUTOMATIC);
                session.setStatus(SessionStatus.COMPLETED);
            }
        }


    }
}
