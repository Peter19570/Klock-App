package com.example.klockapp.service;

import com.example.klockapp.config.security.jwt.JwtService;
import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.DeviceIdRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.request.RefreshTokenRequest;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.exception.custom.*;
import com.example.klockapp.model.RefreshToken;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.RefreshTokenRepo;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepo tokenRepo;


    public AuthResponse login(AuthRequest request){
        Authentication authentication = authenticationManager
                .authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        CustomUserPrincipal principal = (CustomUserPrincipal) authentication.getPrincipal();

        assert principal != null;
        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setToken(refreshToken);
        newRefreshToken.setUser(principal.user());
        tokenRepo.save(newRefreshToken);

        return new AuthResponse(accessToken, refreshToken);
    }

    public void logout(RefreshTokenRequest request){
        RefreshToken token = tokenRepo.findByTokenHash(request.refreshToken())
                .orElseThrow(() -> new NotFoundException("Token not found"));

        tokenRepo.delete(token);
    }

    public AuthResponse refresh(RefreshTokenRequest request){

        String oldRefreshToken = request.refreshToken();
        String username = jwtService.extractUsername(oldRefreshToken);

        User user = userRepo.findByEmail(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        RefreshToken token = tokenRepo.findByTokenHash(oldRefreshToken)
                .orElseThrow(() -> new NotFoundException("Token not found"));

        CustomUserPrincipal principal = new CustomUserPrincipal(user, null);

        if (!jwtService.isTokenValid(oldRefreshToken, principal)){
            throw new InvalidTokenException("Invalid refresh token");
        }
        if (true == token.getRevoked()){
            throw new RevokedTokenException("Token is revoked");
        }

        // Revoke refresh token received
        token.setRevoked(true);

        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        RefreshToken newRefreshToken = new RefreshToken();
        newRefreshToken.setToken(refreshToken);
        newRefreshToken.setUser(principal.user());
        tokenRepo.save(newRefreshToken);

        return new AuthResponse(accessToken, refreshToken);
    }

    // Method to reset password on first log in
    public void changePassword(PasswordRequest request, CustomUserPrincipal principal){
        User user = principal.user();
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setMustChangePassword(false);
        userRepo.save(user);
    }

    // Method to take device id on first log in
    public void getDeviceId(DeviceIdRequest request, CustomUserPrincipal principal){
        User user = principal.user();
        user.setDeviceId(request.deviceId());
        userRepo.save(user);
    }
}
