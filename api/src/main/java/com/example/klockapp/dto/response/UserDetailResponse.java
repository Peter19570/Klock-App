package com.example.klockapp.dto.response;

import com.example.klockapp.enums.UserRole;

import java.time.Instant;

public record UserDetailResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String picture,
        String deviceId,
        UserRole role,
        Double avgEntryProximityDistance,
        String homeBranchName,
        Boolean mustChangePassword,
        Instant createdAt,
        String phone
) {}
