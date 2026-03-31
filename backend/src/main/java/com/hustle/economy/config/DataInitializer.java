package com.hustle.economy.config;

import com.hustle.economy.entity.Community;
import com.hustle.economy.repository.CommunityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final CommunityRepository communityRepository;

    private static final List<String> COMMUNITIES = List.of(
            "KwaNgwenya", "KwaNibela", "KwaMakhasa", "KwaJobe", "KwaMnqobokazi"
    );

    @Override
    public void run(ApplicationArguments args) {
        for (String name : COMMUNITIES) {
            if (communityRepository.findByNameIgnoreCase(name).isEmpty()) {
                communityRepository.save(Community.builder()
                        .name(name)
                        .region("KwaZulu-Natal")
                        .build());
            }
        }
    }
}
