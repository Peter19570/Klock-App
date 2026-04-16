package com.example.klockapp.config.userservice;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;

@Configuration
@RequiredArgsConstructor
public class CustomUserServiceDetails {

    private final UserRepo userRepo;

    @Bean
    public UserDetailsService userDetailsService(){
        return username -> {
            User user = userRepo.findByEmail(username)
                    .orElseThrow(() -> new NotFoundException("User not found"));

            return new CustomUserPrincipal(user, null);
        };
    }
}
