package com.example.klockapp.dto.request;

import com.example.klockapp.enums.ClockOutType;

public record ClockOutRequest(
        ClockOutType clockOutType // MANUAL or AUTOMATIC
) {}
