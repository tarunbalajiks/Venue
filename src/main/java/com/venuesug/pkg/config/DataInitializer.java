package com.venuesug.pkg.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.venuesug.pkg.models.VSUser;
import com.venuesug.pkg.repository.UserRepository;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByUsername("admin").isEmpty()) {
            VSUser admin = new VSUser();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setRole("Admin");
            userRepository.save(admin);
            System.out.println("✓ Default admin user created: username=admin, password=admin, role=Admin");
        }
        
        if (userRepository.findByUsername("user").isEmpty()) {
            VSUser user = new VSUser();
            user.setUsername("user");
            user.setPassword(passwordEncoder.encode("user"));
            user.setRole("User");
            userRepository.save(user);
            System.out.println("✓ Default test user created: username=user, password=user, role=User");
        }
        
        System.out.println("✓ Database initialization complete");
        System.out.println("⏳ Starting Spring Boot application...");
    }
}

