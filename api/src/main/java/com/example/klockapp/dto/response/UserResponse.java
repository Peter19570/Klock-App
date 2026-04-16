package com.example.klockapp.dto.response;

public record UserResponse(
        Long id,
        String email,
        String fullName,
        String picture,
        String homeBranchName
) {}
