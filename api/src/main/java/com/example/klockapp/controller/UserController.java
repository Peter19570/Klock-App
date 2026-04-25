package com.example.klockapp.controller;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.UserCreationRequest;
import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.UserDetailResponse;
import com.example.klockapp.dto.response.UserResponse;
import com.example.klockapp.filter.UserFilter;
import com.example.klockapp.service.UserService;
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
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Personal profile access for any authenticated user.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getMyProfile(
            @AuthenticationPrincipal CustomUserPrincipal principal) {

        UserDetailResponse response = userService.getUserDetails(principal);
        return ResponseEntity.ok(new ApiResponse<>("Profile retrieved", response));
    }

    /**
     * Admin/Super Admin: List users with dynamic branch filtering.
     * Logic: Automatically isolates data for ROLE_ADMIN to their home branch.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) Long homeBranchId) {

        try {
            UserFilter filter = UserFilter.builder()
                    .email(email)
                    .fullName(fullName)
                    .homeBranchId(homeBranchId)
                    .build();

            Pageable pageable = PageRequest.of(page, size, Sort.by("fullName").ascending());
            Page<UserResponse> responses = userService.getAllUsers(pageable, filter, principal);

            return ResponseEntity.ok(new ApiResponse<>("User list retrieved", responses));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Admin/Super Admin: Detailed view of a specific user.
     * Logic: Service prevents local Admins from viewing users in other branches.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getUserDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserPrincipal principal) {

        UserDetailResponse response = userService.getUserDetailsAdmin(id, principal);
        return ResponseEntity.ok(new ApiResponse<>("User details retrieved", response));
    }

    /**
     * Super Admin only: Change a user's home branch assignment
     */
    @PutMapping("/transfer/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> transferUser(
            @PathVariable Long id,
            @RequestParam Long newBranchId) {

        userService.transferUser(id, newBranchId);
        return ResponseEntity.ok(new ApiResponse<>("User transferred successfully", null));
    }

    /**
     * Super Admin only: Remove a user from the system
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Super Admin: Onboard a new Branch Manager.
     */
    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<UserDetailResponse>> createUser(
            @RequestBody @Valid UserCreationRequest request) {
        UserDetailResponse response = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>("User created and assigned to branch", response));
    }
}