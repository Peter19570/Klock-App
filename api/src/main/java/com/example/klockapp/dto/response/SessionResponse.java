package com.example.klockapp.dto.response.record;


import com.example.klockapp.enums.SessionStatus;

import java.time.LocalDate;
import java.util.List;

public record SessionResponse(
        Long id,
        LocalDate workDate,
        String sessionOwner,
        SessionStatus status,
        List<ClockEventResponse> movements
) {}
