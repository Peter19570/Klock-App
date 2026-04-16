package com.example.klockapp.dto.response.record;

public record ApiResponse<T>(
        String message,
        T data
) {
}
