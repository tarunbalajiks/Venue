package com.venuesug.pkg.security;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {
	@Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable()) // disable CSRF for REST APIs
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/vsapi/auth/**", "/vsapi/chat/**", "/h2-console/**").permitAll()
            .anyRequest().authenticated()
        )
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(headers -> headers.frameOptions(frameOptions -> frameOptions.disable())); // For H2 console

    return http.build();
    }
	
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow specific frontend origin - MUST match exactly (protocol, domain, port)
        // When allowCredentials is true, you cannot use "*" - must specify exact origins
        configuration.setAllowedOrigins(List.of(
            "http://54.146.235.10:3000"
        ));
        
        // Allow all HTTP methods including OPTIONS for preflight
        configuration.setAllowedMethods(List.of(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
        ));
        
        // Allow all headers
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("*"));
        
        // Allow credentials - needed for auth headers/cookies
        // IMPORTANT: When this is true, allowedOrigins cannot be "*" - must be specific
        configuration.setAllowCredentials(true);
        
        // Cache preflight OPTIONS requests for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // Apply CORS configuration to all paths
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    // Removed duplicate CORS filter - using corsConfigurationSource() instead
    // The above corsConfigurationSource() bean is sufficient for CORS configuration
}
