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
        String homeBranchName, // Context for the user's base of operations
        Boolean mustChangePassword,
        Instant createdAt
) {}
