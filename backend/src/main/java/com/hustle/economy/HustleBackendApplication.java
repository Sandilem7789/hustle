package com.hustle.economy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class HustleBackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(HustleBackendApplication.class, args);
    }
}
