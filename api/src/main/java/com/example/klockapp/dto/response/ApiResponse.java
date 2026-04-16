package com.example.klockapp.dto.response;

public record ApiResponse<T>(
        String message,
        T data
) {
}
