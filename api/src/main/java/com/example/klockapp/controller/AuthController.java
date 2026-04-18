package com.example.klockapp.controller;

import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.request.RefreshTokenRequest;
import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Login and create cookies for both access and refresh
     */
    @PostMapping("/api/auth/v1/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest request){
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>("Login success", response));
    }

    /**
     * Logout and delete cookies for both access and refresh
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(@RequestBody RefreshTokenRequest request){
        authService.logout(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Reset password after login
     * */
    @PostMapping("/api/auth/{id}/password")
    public ResponseEntity<Void> changePassword(
            @RequestBody PasswordRequest request,
            @PathVariable Long id){
        authService.changePassword(request, id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Refresh and create new cookies for both access and refresh
     */
    @PostMapping("/api/auth/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @RequestBody RefreshTokenRequest request){
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(new ApiResponse<>("New Refresh Tokens", response));
    }

}
