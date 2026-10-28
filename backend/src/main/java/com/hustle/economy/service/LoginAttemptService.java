package com.hustle.economy.service;

import com.hustle.economy.util.PhoneUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Locks sign-in for a phone number after repeated wrong passwords. Kept in memory: the API runs
 * as one instance, and a restart clearing the counters is acceptable.
 */
@Service
public class LoginAttemptService {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(15);
    static final Duration LOCK = Duration.ofMinutes(15);
    private static final int PRUNE_ABOVE = 10_000;

    private record Attempts(int failures, Instant windowStart, Instant lockedUntil) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    /** Runs a login for this phone, refusing it while locked and counting a 401 as a failure. */
    public <T> T guard(String phone, Supplier<T> login) {
        String key = PhoneUtils.normalize(phone == null ? "" : phone);
        Instant now = Instant.now();
        Attempts current = attempts.get(key);
        if (current != null && current.lockedUntil() != null && now.isBefore(current.lockedUntil())) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many wrong passwords. Try again in 15 minutes.");
        }
        try {
            T result = login.get();
            attempts.remove(key);
            return result;
        } catch (ResponseStatusException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) recordFailure(key, now);
            throw e;
        }
    }

    private void recordFailure(String key, Instant now) {
        if (attempts.size() > PRUNE_ABOVE) {
            attempts.values().removeIf(a -> isStale(a, now));
        }
        attempts.compute(key, (k, a) -> {
            if (a == null || isStale(a, now)) return new Attempts(1, now, null);
            int failures = a.failures() + 1;
            return new Attempts(failures, a.windowStart(), failures >= MAX_FAILURES ? now.plus(LOCK) : null);
        });
    }

    private static boolean isStale(Attempts a, Instant now) {
        return a.lockedUntil() != null
                ? !now.isBefore(a.lockedUntil())
                : !now.isBefore(a.windowStart().plus(WINDOW));
    }
}
