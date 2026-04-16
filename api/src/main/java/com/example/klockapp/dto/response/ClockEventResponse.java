package com.example.klockapp.dto.response;

import com.example.klockapp.enums.ClockOutType;

import java.time.Instant;

public record ClockEventResponse(
        Long id,
        String branchName,
        Instant clockInTime,
        Instant clockOutTime,
        ClockOutType clockOutType,
        Double latitudeIn,
        Double longitudeIn
) {}