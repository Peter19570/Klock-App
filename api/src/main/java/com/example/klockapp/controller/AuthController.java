package com.example.klockapp.controller;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.DeviceIdRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.request.RefreshTokenRequest;
import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Login and create cookies for both access and refresh
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody @Valid AuthRequest request){
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>("Login success", response));
    }

    /**
     * Logout and delete cookies for both access and refresh
     */
    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> logout(@RequestBody @Valid RefreshTokenRequest request){
        authService.logout(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Reset password after first login
     * */
    @PostMapping("/reset-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> changePassword(
            @RequestBody @Valid PasswordRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal){
        authService.changePassword(request, principal);
        return ResponseEntity.noContent().build();
    }

    /**
     * Save device-id after first login
     * */
    @PostMapping("/device")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> getDeviceId(
            @RequestBody DeviceIdRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal){
        authService.getDeviceId(request, principal);
        return ResponseEntity.noContent().build();
    }

    /**
     * Refresh and create new cookies for both access and refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @RequestBody @Valid RefreshTokenRequest request){
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(new ApiResponse<>("New Refresh Tokens", response));
    }

}
