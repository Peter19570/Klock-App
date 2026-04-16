package com.example.klockapp.dto.request;

import com.example.klockapp.enums.UserRole;

public record UserCreationRequest(
        String email,
        String firstName,
        String lastName,
        Long managedBranchId,
        UserRole userRole
) {}
