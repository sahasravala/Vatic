package com.vatic;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public record RegisterRequest(String username, String email, String password) {}
    public record LoginRequest(String username, String password) {}

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {

        if (req.username() == null || req.username().trim().length() < 3) {
            return bad("Username must be at least 3 characters");
        }
        if (req.email() == null || !req.email().contains("@")) {
            return bad("Enter a valid email address");
        }
        if (req.password() == null || req.password().length() < 8) {
            return bad("Password must be at least 8 characters");
        }

        String username = req.username().trim();
        String email = req.email().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            return bad("That username is taken");
        }
        if (userRepository.existsByEmail(email)) {
            return bad("An account with that email already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        // the plain password is never stored, only its bcrypt hash
        user.setPasswordHash(passwordEncoder.encode(req.password()));

        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "token", jwtService.generateToken(user),
                "username", user.getUsername()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {

        Optional<User> found = userRepository.findByUsername(
                req.username() == null ? "" : req.username().trim());

        // same message either way, so this cannot be used to discover valid usernames
        if (found.isEmpty() ||
            !passwordEncoder.matches(req.password(), found.get().getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Incorrect username or password"));
        }

        User user = found.get();
        return ResponseEntity.ok(Map.of(
                "token", jwtService.generateToken(user),
                "username", user.getUsername()
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not signed in"));
        }
        return ResponseEntity.ok(Map.of("username", auth.getName()));
    }

    private ResponseEntity<?> bad(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }
}