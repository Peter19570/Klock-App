package com.example.klockapp.service;

import com.example.klockapp.config.security.jwt.JwtService;
import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.PasswordRequest;
import com.example.klockapp.dto.request.RefreshTokenRequest;
import com.example.klockapp.dto.response.AuthResponse;
import com.example.klockapp.exception.custom.*;
import com.example.klockapp.model.Token;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.TokenRepo;
import com.example.klockapp.repo.UserRepo;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
    private final TokenRepo tokenRepo;


    public AuthResponse login(AuthRequest request){
        Authentication authentication = authenticationManager
                .authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        CustomUserPrincipal principal = (CustomUserPrincipal) authentication.getPrincipal();

        assert principal != null;
        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        Token newRefreshToken = new Token();
        newRefreshToken.setToken(refreshToken);
        newRefreshToken.setUser(principal.user());
        tokenRepo.save(newRefreshToken);

        return new AuthResponse(accessToken, refreshToken);
    }

//    public void logout(HttpServletRequest request, HttpServletResponse response) {
//        clearCookie(response, "accessToken", "/");
//        clearCookie(response, "refreshToken", "/api/auth/");
//
//        // 3. Revoke in DB
//        Cookie[] cookies = request.getCookies();
//        if (cookies != null) {
//            for (Cookie cookie : cookies) {
//                if ("refreshToken".equals(cookie.getName())) {
//                    tokenRepo.findByToken(cookie.getValue()).ifPresent(t -> {
//                        t.setRevoked(true);
//                        tokenRepo.save(t);
//                    });
//                }
//            }
//        }
//    }

    public void logout(RefreshTokenRequest request){
        Token token = tokenRepo.findByToken(request.refreshToken())
                .orElseThrow(() -> new NotFoundException("Token not found"));

        tokenRepo.delete(token);
    }

    private void clearCookie(HttpServletResponse response, String name, String path) {
        Cookie cookie = new Cookie(name, null);
        cookie.setPath(path);
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0); // Deletes the cookie
        response.addCookie(cookie);
    }

    public AuthResponse refresh(RefreshTokenRequest request){
//        Cookie[] cookies = request.getCookies();
//
//        String oldRefreshToken = null;
//
//        if (cookies != null){
//            for (Cookie cookie : cookies){
//                if ("refreshToken".equals(cookie.getName())){
//                    oldRefreshToken = cookie.getValue();
//                    break;
//                }
//            }
//        }
        String oldRefreshToken = request.refreshToken();

        String username = jwtService.extractUsername(oldRefreshToken);

        User user = userRepo.findByEmail(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Token token = tokenRepo.findByToken(oldRefreshToken)
                .orElseThrow(() -> new NotFoundException("Token not found"));

        CustomUserPrincipal principal = new CustomUserPrincipal(user, null);

        if (!jwtService.isTokenValid(oldRefreshToken, principal)){
            throw new InvalidTokenException("Invalid refresh token");
        }

        if (true == token.getRevoked()){
            throw new RevokedTokenException("Token is revoked");
        }

        token.setRevoked(true);

        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        Token newRefreshToken = new Token();
        newRefreshToken.setToken(refreshToken);
        newRefreshToken.setUser(principal.user());
        tokenRepo.save(newRefreshToken);

        return new AuthResponse(accessToken, refreshToken);
    }

    public void changePassword(PasswordRequest request, Long id){
        User user = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        user.setPassword(passwordEncoder.encode(request.password()));
        user.setMustChangePassword(false);
        userRepo.save(user);
    }
}
