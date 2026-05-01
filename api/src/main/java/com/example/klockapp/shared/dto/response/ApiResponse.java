package com.example.klockapp.shared.dto.response;

public record ApiResponse<T>(
        String message,
        T data
) {
}
