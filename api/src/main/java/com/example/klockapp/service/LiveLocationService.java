package com.example.klockapp.service;

import com.example.klockapp.dto.request.LiveLocationRequest;
import com.example.klockapp.dto.response.LiveLocationResponse;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class LiveLocationService {

    private final UserRepo userRepo;
    private final ClockEventRepo clockEventRepo;

    /**
     * Checks if the user is currently "At Work" by looking for an open movement.
     * We use ClockEventRepo because that tracks active presence at a branch.
     */
    public boolean isClockedIn(Principal principal) {
        User user = userRepo.findByEmail(principal.getName())
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Guardrail: Active state is determined by any open ClockEvent
        return clockEventRepo.existsByWorkSessionUserAndClockOutTimeIsNull(user);
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
                Instant.now().toString()
        );
    }
}
