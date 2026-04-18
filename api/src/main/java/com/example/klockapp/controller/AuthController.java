package com.example.klockapp.controller;

import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.request.RefreshTokenRequest;
import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Login and create cookies for both access and refresh
     */
//    @PostMapping("/api/auth/v1/login")
//    public ResponseEntity<Void> login(@RequestBody AuthRequest request) {
//        AuthResponse tokens = authService.login(request);
//
//        // Build the Access Token Cookie
//        ResponseCookie accessCookie = ResponseCookie.from("accessToken", tokens.accessToken())
//                .httpOnly(true)
//                .secure(true)    // Recommended: Required for SameSite=None
//                .path("/")
//                .maxAge(604800)    // Set your desired duration
//                .sameSite("None") // Options: "Lax", "Strict", "None"
//                .build();
//
//        // Build the Refresh Token Cookie
//        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", tokens.refreshToken())
//                .httpOnly(true)
//                .secure(true)
//                .path("/api/auth/")
//                .maxAge(604800)
//                .sameSite("Strict") // Usually stricter for refresh tokens
//                .build();
//
//        return ResponseEntity.ok()
//                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
//                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
//                .build();
//    }

    @PostMapping("/api/auth/v1/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@RequestBody AuthRequest request){
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(new ApiResponse<>("Login success", response));
    }

    /**
     * Logout and delete cookies for both access and refresh
     */
//    @PostMapping("/api/auth/logout")
//    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response){
//        authService.logout(request, response);
//        return ResponseEntity.ok().build();
//    }

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
//    @PostMapping("/api/auth/refresh")
//    public ResponseEntity<Void> refresh(
//            HttpServletRequest request,
//            HttpServletResponse response){
//        AuthResponse tokens = authService.refresh(request);
//        Cookie accessCookie = new Cookie("accessToken", tokens.accessToken());
//        accessCookie.setPath("/");
//        accessCookie.setHttpOnly(true);
//
//        Cookie refreshCookie = new Cookie("refreshToken", tokens.refreshToken());
//        refreshCookie.setPath("/api/auth/");
//        refreshCookie.setHttpOnly(true);
//
//        response.addCookie(accessCookie);
//        response.addCookie(refreshCookie);
//        return ResponseEntity.ok().build();
//    }

    @PostMapping("/api/auth/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @RequestBody RefreshTokenRequest request){
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(new ApiResponse<>("New Refresh Tokens", response));
    }


}
