package com.example.klockapp.controller;

import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    @CrossOrigin
    public ResponseEntity<Void> login(
            @RequestBody AuthRequest request,
            HttpServletResponse response){
        AuthResponse tokens = authService.login(request);

        Cookie accessCookie = new Cookie("accessToken", tokens.accessToken());
        accessCookie.setPath("/");
        accessCookie.setHttpOnly(true);

        Cookie refreshCookie = new Cookie("refreshToken", tokens.refreshToken());
        refreshCookie.setPath("/api/auth/");
        refreshCookie.setHttpOnly(true);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
        return ResponseEntity.ok().build();
    }

    /**
     * Logout and delete cookies for both access and refresh
     */
    @PostMapping("/api/auth/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response){
        authService.logout(request, response);
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
    public ResponseEntity<Void> refresh(
            HttpServletRequest request,
            HttpServletResponse response){
        AuthResponse tokens = authService.refresh(request);
        Cookie accessCookie = new Cookie("accessToken", tokens.accessToken());
        accessCookie.setPath("/");
        accessCookie.setHttpOnly(true);

        Cookie refreshCookie = new Cookie("refreshToken", tokens.refreshToken());
        refreshCookie.setPath("/api/auth/");
        refreshCookie.setHttpOnly(true);

        response.addCookie(accessCookie);
        response.addCookie(refreshCookie);
        return ResponseEntity.ok().build();
    }


}
