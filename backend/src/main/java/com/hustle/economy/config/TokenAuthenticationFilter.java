package com.hustle.economy.config;

import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.CustomerAuthService;
import com.hustle.economy.service.DriverAuthService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Turns the three session headers into one Spring Security login. Each valid token adds an
 * authority naming its kind (TOKEN_APP, TOKEN_CUSTOMER, TOKEN_DRIVER); an app session also adds
 * ROLE_ authorities for its account roles. A missing, unknown or expired token is ignored, so
 * public endpoints keep working and protected ones are refused by the rules in SecurityConfig.
 */
@RequiredArgsConstructor
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    public static final String APP = "TOKEN_APP";
    public static final String CUSTOMER = "TOKEN_CUSTOMER";
    public static final String DRIVER = "TOKEN_DRIVER";

    private final AuthService authService;
    private final CustomerAuthService customerAuthService;
    private final DriverAuthService driverAuthService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        List<GrantedAuthority> authorities = new ArrayList<>();

        String appToken = header(request, "X-Auth-Token");
        if (appToken != null) {
            authService.sessionRoles(appToken).ifPresent(roles -> {
                authorities.add(new SimpleGrantedAuthority(APP));
                roles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
            });
        }
        String customerToken = header(request, "X-Customer-Token");
        if (customerToken != null && customerAuthService.hasSession(customerToken)) {
            authorities.add(new SimpleGrantedAuthority(CUSTOMER));
        }
        String driverToken = header(request, "X-Driver-Token");
        if (driverToken != null && driverAuthService.hasSession(driverToken)) {
            authorities.add(new SimpleGrantedAuthority(DRIVER));
        }

        if (!authorities.isEmpty()) {
            SecurityContextHolder.getContext().setAuthentication(
                    UsernamePasswordAuthenticationToken.authenticated("session", null, authorities));
        }
        chain.doFilter(request, response);
    }

    private static String header(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        return value == null || value.isBlank() ? null : value;
    }
}
