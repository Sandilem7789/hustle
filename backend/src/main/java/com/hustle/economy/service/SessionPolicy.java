package com.hustle.economy.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.OffsetDateTime;

/** How long a sign-in lasts. Sessions older than this are refused for every token kind. */
@Component
public class SessionPolicy {

    private final Duration ttl;

    public SessionPolicy(@Value("${auth.session-ttl-days:30}") long ttlDays) {
        this.ttl = Duration.ofDays(ttlDays);
    }

    /** Sessions created before this moment have expired. */
    public OffsetDateTime validFrom() {
        return OffsetDateTime.now().minus(ttl);
    }
}
