package com.example.klockapp.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PasswordRequest(
        @NotNull
        @NotBlank
        String password
) {
}
