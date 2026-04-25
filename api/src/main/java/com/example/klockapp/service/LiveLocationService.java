package com.example.klockapp.service;

import com.example.klockapp.dto.request.LiveLocationRequest;
import com.example.klockapp.dto.response.LiveLocationResponse;
import com.example.klockapp.enums.ArrivalStatus;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.UserRepo;
import com.example.klockapp.repo.WorkSessionRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class LiveLocationService {

    private final UserRepo userRepo;
    private final ClockEventRepo clockEventRepo;
    private final WorkSessionRepo workSessionRepo;

    /**
     * Checks if the user is currently "At Work" by looking for an open movement.
     * We use ClockEventRepo because that tracks active presence at a branch.
     */
    private boolean isClockedIn(Principal principal) {
        User user = userRepo.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Guardrail: Active state is determined by any open ClockEvent
        return clockEventRepo.existsByWorkSessionUserAndClockOutTimeIsNull(user);
    }

    private String getArrivalStatus(Principal principal){
        User user = userRepo.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        WorkSession workSession = workSessionRepo
                .findByWorkDateAndUser(LocalDate.now(), user)
                .orElseThrow(() -> new NotFoundException("Work session not found"));

        ArrivalStatus arrivalStatus = workSession.getArrivalStatus();

        switch (arrivalStatus){
            case EARLY -> {
                return "EARLY";
            }
            case ON_TIME -> {
                return "ON TIME";
            }
            case LATE -> {
                return "LATE";
            }
        }
        return "UNKNOWN";
    }

    private String getSessionState(Principal principal) {
        return isClockedIn(principal) ? "CLOCKED IN" : "CLOCKED OUT";
    }

    /**
     * Handles the webhook/websocket broadcast logic.
     */
    public LiveLocationResponse broadcastLocation(Principal principal, LiveLocationRequest request) {
        User user = userRepo.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return new LiveLocationResponse(
                user.getEmail(),
                user.getFullName(),
                getSessionState(principal),
                request.latitude().toString(),
                request.longitude().toString(),
                Instant.now().toString(),
                getArrivalStatus(principal)
        );
    }
}
