package com.example.klockapp.dto.response;

public record LiveLocationResponse(
        String email,
        String displayName,
        String sessionState,
        String latitude,
        String longitude,
        String timeStamp
) {
}
