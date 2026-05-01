package com.example.klockapp.config.userservice;

import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Configuration
@RequiredArgsConstructor
public class CustomUserServiceDetails {

    private final UserRepo userRepo;

    @Bean
    public UserDetailsService userDetailsService(){
        return username -> {
            User user = userRepo.findByEmail(username)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            return new CustomUserPrincipal(user, null);
        };
    }
}
