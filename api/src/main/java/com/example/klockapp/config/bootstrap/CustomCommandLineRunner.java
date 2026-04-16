package com.example.klockapp.config.bootstrap;

import com.example.klockapp.enums.UserRole;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class CustomCommandLineRunner {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.super.admin.email}")
    private String email;

    @Value("${app.super.admin.password}")
    private String password;

    @Value("${app.super.admin.first-name}")
    private String firstName;

    @Value("${app.super.admin.last-name}")
    private String lastName;

    @Value("${app.user.default.picture}")
    private String profile;

    @Bean
    public CommandLineRunner commandLineRunner(){
        return args -> {
            if (userRepo.existsByRole(UserRole.SUPER_ADMIN)){
                return;
            }

            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setFullName(firstName + " " + lastName);
            user.setPicture(profile);
            user.setRole(UserRole.SUPER_ADMIN);
            user.setMustChangePassword(false);
            userRepo.save(user);

            System.out.println("New Super Admin Created !");
        };
    }
}
