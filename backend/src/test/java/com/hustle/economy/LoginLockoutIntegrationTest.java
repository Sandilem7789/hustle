package com.hustle.economy;

import com.hustle.economy.dto.AuthRequest;
import com.hustle.economy.dto.CustomerLoginRequest;
import com.hustle.economy.dto.UnifiedRegisterRequest;
import com.hustle.economy.service.CustomerAuthService;
import com.hustle.economy.service.UnifiedAuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Transactional
class LoginLockoutIntegrationTest extends AbstractIntegrationTest {

    @Autowired UnifiedAuthService unifiedAuthService;
    @Autowired CustomerAuthService customerAuthService;

    @Test
    void fiveWrongPasswordsLockTheNumberEvenForTheRightPassword() {
        register("0711110001");
        for (int i = 0; i < 5; i++) {
            assertStatus(() -> unifiedAuthService.login(login("0711110001", "wrong")), HttpStatus.UNAUTHORIZED);
        }
        assertStatus(() -> unifiedAuthService.login(login("0711110001", "right-password")), HttpStatus.TOO_MANY_REQUESTS);
        // The same number written another way is the same key
        assertStatus(() -> unifiedAuthService.login(login("+27711110001", "right-password")), HttpStatus.TOO_MANY_REQUESTS);
        // The lock is per number, and covers the older customer login too
        CustomerLoginRequest customerLogin = new CustomerLoginRequest();
        customerLogin.setPhone("0711110001");
        customerLogin.setPassword("right-password");
        assertStatus(() -> customerAuthService.login(customerLogin), HttpStatus.TOO_MANY_REQUESTS);
    }

    @Test
    void successfulLoginResetsTheCount() {
        register("0711110002");
        for (int i = 0; i < 4; i++) {
            assertStatus(() -> unifiedAuthService.login(login("0711110002", "wrong")), HttpStatus.UNAUTHORIZED);
        }
        assertThat(unifiedAuthService.login(login("0711110002", "right-password")).getToken()).isNotBlank();
        for (int i = 0; i < 4; i++) {
            assertStatus(() -> unifiedAuthService.login(login("0711110002", "wrong")), HttpStatus.UNAUTHORIZED);
        }
        assertThat(unifiedAuthService.login(login("0711110002", "right-password")).getToken()).isNotBlank();
    }

    @Test
    void unknownNumbersAreCountedToo() {
        for (int i = 0; i < 5; i++) {
            assertStatus(() -> unifiedAuthService.login(login("0711110003", "guess")), HttpStatus.UNAUTHORIZED);
        }
        assertStatus(() -> unifiedAuthService.login(login("0711110003", "guess")), HttpStatus.TOO_MANY_REQUESTS);
    }

    private void register(String phone) {
        UnifiedRegisterRequest request = new UnifiedRegisterRequest();
        request.setFirstName("Test");
        request.setLastName("Person");
        request.setPhone(phone);
        request.setPassword("right-password");
        unifiedAuthService.register(request);
    }

    private static AuthRequest login(String phone, String password) {
        AuthRequest request = new AuthRequest();
        request.setPhone(phone);
        request.setPassword(password);
        return request;
    }

    private static void assertStatus(Runnable call, HttpStatus expected) {
        assertThatThrownBy(call::run)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode()).isEqualTo(expected));
    }
}
