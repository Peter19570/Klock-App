package com.example.klockapp.controller;

import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.dto.request.BranchRequest;
import com.example.klockapp.dto.request.BranchStatusRequest;
import com.example.klockapp.shared.dto.response.ApiResponse;
import com.example.klockapp.dto.response.BranchDetailsResponse;
import com.example.klockapp.dto.response.BranchResponse;
import com.example.klockapp.service.BranchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@Tag(name = "Branch")
public class BranchController {

    private final BranchService branchService;

    /**
     * Super Admin: Create a new office location.
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<BranchDetailsResponse>> createBranch(
            @RequestBody BranchRequest request) {
        BranchDetailsResponse response = branchService.createBranch(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Branch created successfully", response));
    }

    /**
     * Public/Authenticated: Lightweight list for registration dropdowns and general lists.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<BranchResponse>>> getAllBranches(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("displayName").ascending());
        Page<BranchResponse> responses = branchService.getAllBranches(pageable);
        return ResponseEntity.ok(new ApiResponse<>("Branches retrieved", responses));
    }

    /**
     * Admin/Super Admin: Branch dashboard showing Assigned Staff vs. Active Users.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BranchDetailsResponse>> getBranchDetails(
            @PathVariable Long id) {
        BranchDetailsResponse response = branchService.getBranchDetails(id);
        return ResponseEntity.ok(new ApiResponse<>("Branch dashboard details", response));
    }

    /**
     * Super Admin: Update full branch coordinates and details.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<BranchDetailsResponse>> updateBranch(
            @PathVariable Long id,
            @RequestBody BranchRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        return ResponseEntity.ok(new ApiResponse<>("Branch updated",
                branchService.updateBranch(id, request, principal.user())));
    }

    /**
     * Admin/Super Admin: Local radius adjustment with "Final Word" lock logic.
     */
    @PutMapping("/radius/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<BranchDetailsResponse>> updateRadius(
            @PathVariable Long id,
            @RequestParam Double radius,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        BranchDetailsResponse response = branchService.updateBranchRadius(id, radius, principal);
        return ResponseEntity.ok(new ApiResponse<>("Branch radius updated", response));
    }

    /**
     * Super Admin: Remove a branch from the system.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteBranch(@PathVariable Long id) {
        branchService.deleteBranch(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/managed/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<BranchDetailsResponse>> getManagedBranch(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @PathVariable(value = "id", required = false) Long id) {

        BranchDetailsResponse response = branchService.getAdminManagedBranch(principal, id);
        return ResponseEntity.ok(new ApiResponse<>("Branch data retrieved", response));
    }

    @PostMapping("/status/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> setBranchStatus(
            @RequestBody @Valid BranchStatusRequest request,
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserPrincipal principal){
        branchService.setBranchStatus(request, id, principal.user());
        return ResponseEntity.noContent().build();
    }
}