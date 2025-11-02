package com.venuesug.pkg.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.venuesug.pkg.models.VSUser;
import com.venuesug.pkg.repository.UserRepository;

@Service
public class UserService {
	@Autowired private UserRepository repo;
    @Autowired private PasswordEncoder encoder;

    public VSUser register(VSUser user) {
        user.setPassword(encoder.encode(user.getPassword()));
        return repo.save(user);
    }

    public VSUser login(String username, String password) {
    	VSUser user = repo.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (encoder.matches(password, user.getPassword())) return user;
        throw new RuntimeException("Invalid credentials");
    }
}
