package com.venuesug.pkg.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.venuesug.pkg.models.VSUser;
import com.venuesug.pkg.security.JwtUtil;
import com.venuesug.pkg.service.UserService;

@RestController
@RequestMapping("/vsapi/auth")
@CrossOrigin(origins = "http://54.146.235.10:3000")
public class AuthController {
	@Autowired private UserService service;
    @Autowired private JwtUtil jwtUtil;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody VSUser user) {
        return ResponseEntity.ok(service.register(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody VSUser user) {
    	VSUser u = service.login(user.getUsername(), user.getPassword());
        String token = jwtUtil.generateToken(u.getUsername(), u.getRole());
        return ResponseEntity.ok(Map.of("token", token, "role", u.getRole()));
    }
}
