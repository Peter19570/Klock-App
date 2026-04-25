package com.example.klockapp.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record ClockInRequest(
        @NotNull
        @DecimalMin(value = "-90.0", message = "Latitude must be >= -90")
        @DecimalMax(value = "90.0", message = "Latitude must be <= 90")
        Double latitude,

        @NotNull
        @DecimalMin(value = "-180.0", message = "Longitude must be >= -180")
        @DecimalMax(value = "180.0", message = "Longitude must be <= 180")
        Double longitude,

        @NotNull Double accuracy,
        Boolean isDelaySync,
        String deviceId,
        Integer batteryLevel,
        Integer signalStrength,
        LocalTime clientTimeStamp
) {}
