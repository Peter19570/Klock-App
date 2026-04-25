package com.example.klockapp.dto.request;

import com.example.klockapp.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UserCreationRequest(
        @NotNull
        @NotBlank
        String email,

        @NotNull
        @NotBlank
        String firstName,

        @NotNull
        @NotBlank
        String lastName,
        Long managedBranchId,
        UserRole userRole
) {}
