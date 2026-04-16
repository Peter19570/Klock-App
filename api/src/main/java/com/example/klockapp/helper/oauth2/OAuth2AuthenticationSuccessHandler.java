package com.example.klockapp.helper.oauth2;


import com.example.klockapp.config.security.jwt.JwtService;
import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.model.Token;
import com.example.klockapp.repo.TokenRepo;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final TokenRepo tokenRepo;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        CustomUserPrincipal principal = (CustomUserPrincipal) authentication.getPrincipal();

        // Generate both
        assert principal != null;
        String accessToken = jwtService.generateAccessToken(principal);
        String refreshToken = jwtService.generateRefreshToken(principal);

        Token newRefreshToken = new Token();
        newRefreshToken.setToken(refreshToken);
        newRefreshToken.setUser(principal.user());
        tokenRepo.save(newRefreshToken);

        try {
            Cookie accessCookie = new Cookie("accessToken", accessToken);
            accessCookie.setHttpOnly(true);
            accessCookie.setPath("/");
            accessCookie.setMaxAge(900); // 15 minutes
            response.addCookie(accessCookie);

            Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
            refreshCookie.setHttpOnly(true);
            refreshCookie.setPath("/api/auth/");
            refreshCookie.setMaxAge(604800); // 7 days
            response.addCookie(refreshCookie);

        } catch (Exception e){
            System.out.println(e.getMessage());
        }

        response.setHeader("Set-Cookie", "accessToken=" + accessToken + "; Path=/; HttpOnly; MaxAge=900; SameSite=Lax");

        getRedirectStrategy().sendRedirect(request, response, "http://localhost:5173/dashboard");
    }
}

