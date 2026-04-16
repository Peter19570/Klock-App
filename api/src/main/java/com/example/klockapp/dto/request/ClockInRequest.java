package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotNull;

public record ClockInRequest(
        @NotNull Double latitude,
        @NotNull Double longitude
) {}
