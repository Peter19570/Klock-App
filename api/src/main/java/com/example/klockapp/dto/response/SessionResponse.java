package com.example.klockapp.dto.response;


import com.example.klockapp.enums.ArrivalStatus;
import com.example.klockapp.enums.SessionStatus;

import java.time.LocalDate;
import java.util.List;

public record SessionResponse(
        Long id,
        LocalDate workDate,
        String sessionOwner,
        ArrivalStatus arrivalStatus,
        SessionStatus status,
        List<ClockEventResponse> movements
) {}
