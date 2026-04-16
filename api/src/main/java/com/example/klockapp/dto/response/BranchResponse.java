package com.example.klockapp.dto.response.record;

import com.example.klockapp.enums.BranchStatus;

public record BranchResponse(
        Long id,
        String displayName,
        Double latitude,
        Double longitude,
        Double radius,
        BranchStatus branchStatus
) {}
