package com.example.klockapp.dto.response.record;

import com.example.klockapp.enums.UserRole;

import java.time.Instant;

public record UserDetailResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        UserRole role,
        String homeBranchName, // Context for the user's base of operations
        Boolean mustChangePassword,
        Instant createdAt
) {}
