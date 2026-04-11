package com.hustle.economy.service;

import com.hustle.economy.dto.DriverAuthResponse;
import com.hustle.economy.dto.DriverLoginRequest;
import com.hustle.economy.dto.DriverRegisterRequest;
import com.hustle.economy.dto.DriverResponse;
import com.hustle.economy.entity.Community;
import com.hustle.economy.entity.Driver;
import com.hustle.economy.entity.DriverSession;
import com.hustle.economy.entity.DriverStatus;
import com.hustle.economy.repository.CommunityRepository;
import com.hustle.economy.repository.DriverRepository;
import com.hustle.economy.repository.DriverSessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverAuthService {

    private final DriverRepository driverRepository;
    private final DriverSessionRepository driverSessionRepository;
    private final CommunityRepository communityRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public DriverAuthResponse register(DriverRegisterRequest req) {
        if (driverRepository.findByPhone(req.getPhone()).isPresent()) {
            throw new RuntimeException("Phone already registered");
        }

        Community community = communityRepository.findById(req.getCommunityId())
                .orElseThrow(() -> new EntityNotFoundException("Community not found"));

        Driver driver = Driver.builder()
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .phone(req.getPhone())
                .idNumber(req.getIdNumber())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .vehicleType(req.getVehicleType())
                .communityBase(community)
                .status(DriverStatus.PENDING)
                .createdAt(OffsetDateTime.now())
                .build();

        driver = driverRepository.save(driver);

        String token = UUID.randomUUID().toString().replace("-", "");
        driverSessionRepository.save(DriverSession.builder()
                .token(token)
                .driver(driver)
                .createdAt(OffsetDateTime.now())
                .build());

        return toAuthResponse(token, driver);
    }

    @Transactional
    public DriverAuthResponse login(DriverLoginRequest req) {
        Driver driver = driverRepository.findByPhone(req.getPhone())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(req.getPassword(), driver.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        driverSessionRepository.save(DriverSession.builder()
                .token(token)
                .driver(driver)
                .createdAt(OffsetDateTime.now())
                .build());

        return toAuthResponse(token, driver);
    }

    @Transactional(readOnly = true)
    public Driver requireAuth(String token) {
        DriverSession session = driverSessionRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
        return session.getDriver();
    }

    @Transactional(readOnly = true)
    public DriverResponse getDriver(UUID driverId) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new EntityNotFoundException("Driver not found"));
        return toDriverResponse(driver);
    }

    public DriverResponse toDriverResponse(Driver driver) {
        return DriverResponse.builder()
                .driverId(driver.getId().toString())
                .firstName(driver.getFirstName())
                .lastName(driver.getLastName())
                .phone(driver.getPhone())
                .vehicleType(driver.getVehicleType().name())
                .communityName(driver.getCommunityBase() != null ? driver.getCommunityBase().getName() : null)
                .status(driver.getStatus().name())
                .createdAt(driver.getCreatedAt())
                .build();
    }

    private DriverAuthResponse toAuthResponse(String token, Driver driver) {
        return DriverAuthResponse.builder()
                .token(token)
                .driverId(driver.getId().toString())
                .firstName(driver.getFirstName())
                .lastName(driver.getLastName())
                .vehicleType(driver.getVehicleType().name())
                .communityName(driver.getCommunityBase() != null ? driver.getCommunityBase().getName() : null)
                .build();
    }
}
