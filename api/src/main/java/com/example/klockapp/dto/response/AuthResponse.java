package com.example.klockapp.dto.response.record;

public record AuthResponse(
        String accessToken ,
        String refreshToken
) {
}
