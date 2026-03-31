package com.hustle.economy.controller;

import com.hustle.economy.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final AuthService authService;

    @Value("${app.uploads.dir:/app/uploads}")
    private String uploadsDir;

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(
            @RequestHeader("X-Auth-Token") String token,
            @RequestParam("file") MultipartFile file) throws IOException {
        authService.requireAuth(token);

        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : ".jpg";
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        Path dir = Paths.get(uploadsDir);
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(filename));

        return ResponseEntity.ok(Map.of("url", "/api/uploads/" + filename));
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Path file = Paths.get(uploadsDir).resolve(filename).normalize();
        Resource resource = new FileSystemResource(file);
        if (!resource.exists()) {
            return ResponseEntity.notFound().build();
        }
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }
}
