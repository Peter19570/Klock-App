package com.example.klockapp.dto.response;

public record AuthResponse(
        String accessToken ,
        String refreshToken
) {
}
