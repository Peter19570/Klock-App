package com.example.klockapp.dto.response;

import com.example.klockapp.enums.AuditOption;

import java.time.Instant;
import java.time.LocalTime;
import java.util.Map;

public record AuditLogResponse(
        Long id,
        String fullName,
        String userId,
        AuditOption type,
        Instant createdAt,
        Map<String, Object> auditInfo
) {
}
