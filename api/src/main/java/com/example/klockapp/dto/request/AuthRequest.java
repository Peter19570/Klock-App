package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotNull;

public record AuthRequest(
        @NotNull String email,
        @NotNull String password
) {
}
