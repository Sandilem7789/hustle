package com.hustle.economy.config;

import com.hustle.economy.service.AuthService;
import com.hustle.economy.service.CustomerAuthService;
import com.hustle.economy.service.DriverAuthService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

import static com.hustle.economy.config.TokenAuthenticationFilter.APP;
import static com.hustle.economy.config.TokenAuthenticationFilter.CUSTOMER;
import static com.hustle.economy.config.TokenAuthenticationFilter.DRIVER;
import static org.springframework.http.HttpMethod.*;

/**
 * Every API access rule lives here. Anything not listed is refused (denyAll), so a new
 * endpoint is closed until a rule opens it. Controllers still load the signed-in account
 * through the auth services, which repeat the token check.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] STAFF = {"FACILITATOR", "COORDINATOR"};

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, AuthService authService,
                                           CustomerAuthService customerAuthService,
                                           DriverAuthService driverAuthService) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Upload responses set their own long-lived Cache-Control; keep that behaviour
                .headers(h -> h.cacheControl(c -> c.disable()))
                .addFilterBefore(new TokenAuthenticationFilter(authService, customerAuthService, driverAuthService),
                        AnonymousAuthenticationFilter.class)
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> res.sendError(
                                HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired session. Please log in again."))
                        .accessDeniedHandler((req, res, ex) -> res.sendError(
                                HttpServletResponse.SC_FORBIDDEN, "Access denied")))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers("/error").permitAll()

                        // Public: sign-in, sign-up, browsing and applying
                        .requestMatchers(POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(POST, "/api/customers/login", "/api/customers/register").permitAll()
                        .requestMatchers(POST, "/api/drivers/login", "/api/drivers/register").permitAll()
                        .requestMatchers(POST, "/api/orders/validate-distance").permitAll()
                        .requestMatchers(POST, "/api/hustlers").permitAll()
                        .requestMatchers(GET, "/api/communities", "/api/communities/*/hustlers").permitAll()
                        .requestMatchers(GET, "/api/uploads/**").permitAll()
                        .requestMatchers(GET, "/api/products/my", "/api/products/by-barcode/*").hasAuthority(APP)
                        .requestMatchers(GET, "/api/products", "/api/products/*").permitAll()

                        // Buyers (X-Customer-Token)
                        .requestMatchers("/api/customers/**").hasAuthority(CUSTOMER)
                        .requestMatchers(GET, "/api/orders/my").hasAuthority(CUSTOMER)
                        .requestMatchers(POST, "/api/orders").hasAuthority(CUSTOMER)

                        // Drivers (X-Driver-Token)
                        .requestMatchers("/api/drivers/**").hasAuthority(DRIVER)

                        // Staff: Community Agent / Hub Coordinator (X-Auth-Token with a staff role)
                        .requestMatchers("/api/applicants/**", "/api/facilitator/**", "/api/operations/**",
                                "/api/survey-templates/**").hasAnyRole(STAFF)
                        .requestMatchers(POST, "/api/communities").hasAnyRole(STAFF)
                        .requestMatchers(GET, "/api/hustlers").hasAnyRole(STAFF)
                        .requestMatchers(PATCH, "/api/hustlers/*/decision", "/api/hustlers/*/profile").hasAnyRole(STAFF)
                        .requestMatchers(GET, "/api/survey-assignments", "/api/survey-assignments/*/answers").hasAnyRole(STAFF)
                        .requestMatchers(POST, "/api/survey-assignments", "/api/survey-assignments/*/generate-report").hasAnyRole(STAFF)

                        // Any signed-in app account; the services check shop ownership
                        .requestMatchers("/api/hustlers/me/**", "/api/products/**", "/api/income/**", "/api/sales/**",
                                "/api/orders/**", "/api/notifications/**", "/api/survey-assignments/**").hasAuthority(APP)
                        .requestMatchers(POST, "/api/uploads").hasAuthority(APP)

                        .anyRequest().denyAll());
        return http.build();
    }
}
