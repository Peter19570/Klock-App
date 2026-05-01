package com.example.klockapp.common.dto.response;

public record ApiResponse<T>(
        String message,
        T data
) {
}
