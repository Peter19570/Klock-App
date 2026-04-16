package com.example.klockapp.helper.oauth2;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService
        implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepo userRepo;
    private final OidcUserService oidcUserService = new OidcUserService();

    // This handles standard OAuth2 (like GitHub)
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        return processUser(userRequest, oAuth2User.getAttributes());
    }

    // This handles OIDC (like Google)
    public OidcUser loadOidcUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = oidcUserService.loadUser(userRequest);
        return processUser(userRequest, oidcUser.getAttributes());
    }

    private CustomUserPrincipal processUser(OAuth2UserRequest userRequest, Map<String, Object> attributes) {
        String email = (String) attributes.get("email");
        String provider = userRequest.getClientRegistration().getRegistrationId();

        User user = userRepo.findByEmail(email)
                .map(existingUser -> {
                    existingUser.setFirstName((String) attributes.get("given_name"));
                    existingUser.setLastName((String) attributes.get("family_name"));
                    existingUser.setPicture((String) attributes.get("picture"));
                    existingUser.setFullName((String) attributes.get("name"));
                    return userRepo.save(existingUser);
                })
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setFirstName((String) attributes.get("given_name"));
                    newUser.setLastName((String) attributes.get("family_name"));
                    newUser.setFullName((String) attributes.get("name"));
                    newUser.setRole(UserRole.USER);
                    newUser.setPicture((String) attributes.get("picture"));
                    newUser.setProvider(provider.toUpperCase());
                    return userRepo.save(newUser);
                });

        return new CustomUserPrincipal(user, attributes);
    }
}
