package com.example.klockapp.dto.request;

public record OnBoardRequest(
        String firstName,
        String lastName,
        Long homeBranchId // Added this field
) {}
