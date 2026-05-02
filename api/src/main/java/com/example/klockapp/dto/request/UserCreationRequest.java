package com.example.klockapp.dto.request;

import com.example.klockapp.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

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

        @Size(min = 0, max = 15)
        String phone,

        Long managedBranchId,
        UserRole userRole
) {}
