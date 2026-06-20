package com.smartcampus.smart_campus.security;

import jakarta.servlet.DispatcherType;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsUtils;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JWTAuthFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2UserService oAuth2UserService;

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            ObjectProvider<OAuth2AuthorizationRequestResolver> oauth2AuthorizationRequestResolverProvider
    ) throws Exception {

        http
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration crf = new CorsConfiguration();
                    crf.setAllowedOriginPatterns(List.of("http://localhost:*"));
                    crf.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                    crf.setAllowedHeaders(List.of("*"));
                    crf.setAllowCredentials(true);
                    return crf;
                }))
                .csrf(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers(request -> CorsUtils.isPreFlightRequest(request)).permitAll()

                        .requestMatchers("/auth/me").authenticated()
                        .requestMatchers(
                                "/error",
                                "/auth/**",
                                "/forgotpass/**",
                                "/oauth2/**",
                                "/login/**"
                        ).permitAll()

                        .anyRequest().authenticated()
                )

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Unauthorized\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Forbidden\"}");
                        })
                )

                .authenticationProvider(authenticationProvider)

                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        OAuth2AuthorizationRequestResolver oauth2AuthorizationRequestResolver =
                oauth2AuthorizationRequestResolverProvider.getIfAvailable();

        if (oauth2AuthorizationRequestResolver != null) {
            http.oauth2Login(oauth -> oauth
                        .authorizationEndpoint(authorization -> authorization
                                .authorizationRequestResolver(oauth2AuthorizationRequestResolver)
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(oAuth2UserService)
                        )
                        .successHandler(oAuth2SuccessHandler)
                );
        }

        return http.build();
    }

    @Bean
    @ConditionalOnBean(ClientRegistrationRepository.class)
    public OAuth2AuthorizationRequestResolver oauth2AuthorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository
    ) {
        DefaultOAuth2AuthorizationRequestResolver resolver =
                new DefaultOAuth2AuthorizationRequestResolver(
                        clientRegistrationRepository,
                        "/oauth2/authorization"
                );

        resolver.setAuthorizationRequestCustomizer(customizer ->
                customizer.additionalParameters(params ->
                        params.put("prompt", "select_account")
                )
        );

        return resolver;
    }
}
