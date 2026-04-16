package com.example.klockapp.config.cloudinary;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class CloudinaryConfig {

    @Value("${app.cloudinary.api.key}")
    private String apiKey;

    @Value("${app.cloudinary.api.secret}")
    private String apiSecret;

    @Value("${app.cloudinary.cloud.name}")
    private String cloudName;

    @Bean
    public Cloudinary cloudinary(){
        Map<String, String> config = new HashMap<>();
        config.put("api_key", apiKey);
        config.put("api_secret", apiSecret);
        config.put("cloud_name", cloudName);
        return new Cloudinary(config);
    }
}
