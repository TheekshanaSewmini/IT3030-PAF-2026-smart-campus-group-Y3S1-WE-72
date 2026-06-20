package com.smartcampus.smart_campus.security;

import com.smartcampus.smart_campus.entities.User;
import com.smartcampus.smart_campus.enums.AuthProvider;
import com.smartcampus.smart_campus.enums.Role;
import com.smartcampus.smart_campus.enums.Token;
import com.smartcampus.smart_campus.repo.UserRepo;
import com.smartcampus.smart_campus.utils.JwtUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private static final Pattern SLIIT_EMAIL_PATTERN =
            Pattern.compile("^IT\\d+@my\\.sliit\\.lk$", Pattern.CASE_INSENSITIVE);

    private final UserRepo userRepo;
    private final JwtUtils jwtUtils;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend.oauth-success-url:http://localhost:5173/oauth-success}")
    private String oauthSuccessRedirectUrl;

    @Value("${app.frontend.login-url:http://localhost:5173/login}")
    private String loginRedirectUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        String email = normalizeEmail(oauthUser.getAttribute("email"));
        String name = oauthUser.getAttribute("name");
        String providerId = extractProviderId(oauthUser);

        if (!StringUtils.hasText(email)) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "Email not found from OAuth2 provider");
            return;
        }
        if (!isAllowedSliitEmail(email)) {
            jwtUtils.removeToken(response, Token.ACCESS);
            jwtUtils.removeToken(response, Token.REFRESH);
            log.warn("Blocked OAuth2 login for non-SLIIT email: {}", email);

            String errorMessage = URLEncoder.encode(
                    "Use your SLIIT email (IT23687882@my.sliit.lk) for Google login.",
                    StandardCharsets.UTF_8
            );
            response.sendRedirect(loginRedirectUrl + "?oauthError=" + errorMessage);
            return;
        }

        User user = userRepo.findByEmailIgnoreCase(email)
                .orElseGet(() -> createOAuthUser(email, name, providerId));

        if (user.getRole() == null) {
            user.setRole(Role.USER);
        }
        if (!Boolean.TRUE.equals(user.getIsVerified())) {
            user.setIsVerified(true);
        }
        if (user.getProvider() == null) {
            user.setProvider(AuthProvider.GOOGLE);
            user.setProviderId(providerId);
        }
        if (user.getProvider() == AuthProvider.GOOGLE
                && !StringUtils.hasText(user.getProviderId())
                && StringUtils.hasText(providerId)) {
            user.setProviderId(providerId);
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("email", user.getEmail());
        claims.put("role", user.getRole().name());

        jwtUtils.generateToken(claims, user, response, Token.ACCESS);
        String refreshToken = jwtUtils.generateToken(claims, user, response, Token.REFRESH);

        user.setRefreshToken(refreshToken);
        userRepo.save(user);

        response.sendRedirect(oauthSuccessRedirectUrl);
    }

    private User createOAuthUser(String email, String name, String providerId) {
        User user = new User();
        user.setEmail(email);
        user.setFirstname(StringUtils.hasText(name) ? name : "GoogleUser");
        user.setLastName("");
        user.setRole(Role.USER);
        user.setIsVerified(true);
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setProvider(AuthProvider.GOOGLE);
        user.setProviderId(providerId);
        return userRepo.save(user);
    }

    private boolean isAllowedSliitEmail(String email) {
        return StringUtils.hasText(email)
                && SLIIT_EMAIL_PATTERN.matcher(email).matches();
    }

    private String extractProviderId(OAuth2User oauthUser) {
        String sub = oauthUser.getAttribute("sub");
        if (StringUtils.hasText(sub)) {
            return sub;
        }
        String id = oauthUser.getAttribute("id");
        return StringUtils.hasText(id) ? id : null;
    }

    private String normalizeEmail(Object emailAttribute) {
        if (emailAttribute == null) {
            return null;
        }

        String value = String.valueOf(emailAttribute).trim();
        if (value.isEmpty()) {
            return null;
        }

        return value.toLowerCase(Locale.ROOT);
    }
}

