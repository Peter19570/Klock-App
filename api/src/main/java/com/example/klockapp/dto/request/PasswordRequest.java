package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotNull;

public record PasswordRequest(
        @NotNull String password
) {
}
