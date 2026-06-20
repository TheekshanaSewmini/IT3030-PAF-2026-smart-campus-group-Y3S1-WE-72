package com.smartcampus.smart_campus.controller;

import com.smartcampus.smart_campus.dtos.AuthResponse;
import com.smartcampus.smart_campus.dtos.UserDto;
import com.smartcampus.smart_campus.enums.Token;
import com.smartcampus.smart_campus.records.LoginRequest;
import com.smartcampus.smart_campus.repo.UserRepo;
import com.smartcampus.smart_campus.service.AuthService;
import com.smartcampus.smart_campus.utils.JwtUtils;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import com.smartcampus.smart_campus.entities.User;

import java.util.Map;
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepo userRepo;
    private final JwtUtils jwtUtils;

    // Register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody UserDto.RegisterRequest req,
            HttpServletResponse response
    ) {

        AuthResponse res = authService.signUp(req);

        Cookie cookie = new Cookie("userEmail", req.email());
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(30 * 60);

        response.addCookie(cookie);

        return ResponseEntity.ok(res);
    }

    // Login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest req,
            HttpServletResponse response
    ) {
        return ResponseEntity.ok(authService.signIn(req, response));
    }

    // Verify OTP
    @PostMapping("/verify-code")
    public ResponseEntity<AuthResponse> verify(
            @RequestBody UserDto.VerifyCodeDto dto,
            HttpServletRequest request
    ) {

        String email = getCookie(request, "userEmail");

        if (email == null) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder()
                            .message("Email not found")
                            .success(false)
                            .build());
        }

        return ResponseEntity.ok(authService.verifyCode(email, dto.verifyCode()));
    }

    // Resend OTP
    @PostMapping("/resend-otp")
    public ResponseEntity<AuthResponse> resend(HttpServletRequest request) {

        String email = getCookie(request, "userEmail");

        if (email == null) {
            return ResponseEntity.badRequest()
                    .body(AuthResponse.builder()
                            .message("Email not found")
                            .success(false)
                            .build());
        }

        return ResponseEntity.ok(authService.resendOtp(email));
    }

    // Logout
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Clear auth tokens
        jwtUtils.removeToken(response, Token.ACCESS);
        jwtUtils.removeToken(response, Token.REFRESH);
        
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }

    // Check phone
    @PostMapping("/check-phone")
    public ResponseEntity<Map<String, Boolean>> checkPhone(@RequestBody Map<String, String> body) {

        String phone = body.get("phoneNumber");
        boolean available = userRepo.findByPhoneNumber(phone).isEmpty();

        return ResponseEntity.ok(Map.of("available", available));
    }

    // Current user
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        User user = userRepo.findByEmailIgnoreCase(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("user", user);
        response.put("authenticated", true);

        return ResponseEntity.ok(response);
    }

    // Refresh token
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = jwtUtils.getTokenFromCookie(request, Token.REFRESH);

        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("message", "No refresh token"));
        }

        try {
            String username = jwtUtils.extractUsername(refreshToken);
            User user = userRepo.findByEmailIgnoreCase(username).orElseThrow(() -> new RuntimeException("User not found"));

            // Validate token and match stored refresh token
            if (jwtUtils.validateToken(refreshToken, user) && refreshToken.equals(user.getRefreshToken())) {
                Map<String, Object> claims = new java.util.HashMap<>();
                claims.put("email", user.getEmail());
                claims.put("role", user.getRole().name());

                String newAccessToken = jwtUtils.generateToken(claims, user, response, Token.ACCESS);
                String newRefreshToken = jwtUtils.generateToken(claims, user, response, Token.REFRESH);

                user.setRefreshToken(newRefreshToken);
                userRepo.save(user);

                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "accessToken", newAccessToken,
                        "refreshToken", newRefreshToken
                ));
            } else {
                return ResponseEntity.status(403).body(Map.of("message", "Invalid refresh token"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(403).body(Map.of("message", "Invalid refresh token"));
        }
    }

    // Cookie helper
    private String getCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;

        for (Cookie c : request.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }
}

