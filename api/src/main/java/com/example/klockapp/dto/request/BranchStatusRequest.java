package com.example.klockapp.dto.request;

import com.example.klockapp.enums.BranchStatus;

public record BranchStatusRequest(
        BranchStatus branchStatus
) {
}
