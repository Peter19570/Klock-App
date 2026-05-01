package com.example.klockapp.dto.response;

import com.example.klockapp.enums.UserRole;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String picture,
        UserRole role,
        String homeBranchName,
        Double avgEntryProximityDistance
) {}
