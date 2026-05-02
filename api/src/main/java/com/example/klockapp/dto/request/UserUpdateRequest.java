package com.example.klockapp.dto.request;

import com.example.klockapp.enums.UserRole;

public record UserUpdateRequest(
        String email,
        String firstName,
        String lastName,
        UserRole userRole,
        String phone
) {
}
