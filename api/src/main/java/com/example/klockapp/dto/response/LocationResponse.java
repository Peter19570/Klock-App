package com.example.klockapp.dto.response;

import java.time.Instant;

public record LocationResponse(
        Double latitude,
        Double longitude,
        Instant createdAt
) {
}
