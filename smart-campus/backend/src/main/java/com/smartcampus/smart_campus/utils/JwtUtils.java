package com.smartcampus.smart_campus.utils;

import com.smartcampus.smart_campus.enums.Token;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.util.WebUtils;

import java.security.Key;
import java.util.*;
import java.util.stream.Collectors;

@Component
@Slf4j
public class JwtUtils {

    @Value("${spring.jwt.secret:}")
    private String secretKey;

    @Value("${spring.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${spring.cookie.same-site:Lax}")
    private String cookieSameSite;

    // Token expiry times
    private static final long ACCESS_EXPIRATION_MS = 60 * 60 * 1000;
    private static final long REFRESH_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000L;
    private static final long VERIFY_EXPIRATION_MS = 30 * 60 * 1000;

    // Create JWT and set it as HttpOnly cookie
    public String generateToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            HttpServletResponse response,
            Token tokenType
    ) {

        Map<String, Object> claims = new HashMap<>(extraClaims);

        claims.put("roles",
                userDetails.getAuthorities()
                        .stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toList())
        );

        long expiration = switch (tokenType) {
            case ACCESS -> ACCESS_EXPIRATION_MS;
            case REFRESH -> REFRESH_EXPIRATION_MS;
            case VERIFY -> VERIFY_EXPIRATION_MS;
        };

        String token = Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();

        addCookie(response, tokenType, token, expiration);

        return token;
    }

    // Add token cookie in response header
    private void addCookie(HttpServletResponse response, Token type, String token, long expiryMs) {
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                buildCookie(type.name(), token, expiryMs / 1000).toString()
        );
    }

    public String getTokenFromCookie(HttpServletRequest request, Token type) {
        Cookie cookie = WebUtils.getCookie(request, type.name());
        return cookie != null ? cookie.getValue() : null;
    }
    // Remove token cookie by setting max-age to 0
    public void removeToken(HttpServletResponse response, Token tokenType) {
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                buildCookie(tokenType.name(), "", 0).toString()
        );
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        try {
            return extractUsername(token).equals(userDetails.getUsername())
                    && !isTokenExpired(token);
        } catch (JwtException e) {
            log.warn("JWT validation error: {}", e.getMessage());
            return false;
        }
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    private boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("Configure spring.jwt.secret with a Base64-encoded 256-bit key.");
        }

        byte[] keyBytes = Decoders.BASE64.decode(secretKey.trim());
        if (keyBytes.length < 32) {
            throw new IllegalStateException("spring.jwt.secret must decode to at least 256 bits.");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private ResponseCookie buildCookie(String name, String value, long maxAgeSeconds) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAgeSeconds)
                .sameSite(resolveSameSite())
                .build();
    }

    // SameSite=None requires secure cookies
    private String resolveSameSite() {
        if (cookieSameSite == null || cookieSameSite.isBlank()) {
            return "Lax";
        }

        String normalized = cookieSameSite.trim().toLowerCase();

        if (!cookieSecure && "none".equals(normalized)) {
            return "Lax";
        }

        return switch (normalized) {
            case "strict" -> "Strict";
            case "none" -> "None";
            default -> "Lax";
        };
    }
}
