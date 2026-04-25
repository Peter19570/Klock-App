package com.example.klockapp.dto.response;

import java.time.LocalTime;

public record AuditLogResponse(
        String deviceId,
        Integer batteryLevel,
        Integer signalStrength,
        Double gpsAccuracy,
        LocalTime clientTimeStamp,
        Boolean verified
) {
}
