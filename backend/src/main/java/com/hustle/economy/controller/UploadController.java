package com.hustle.economy.controller;

import com.hustle.economy.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final AuthService authService;
    private final S3Client s3Client;

    @Value("${r2.bucket}")
    private String bucket;

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(
            @RequestHeader("X-Auth-Token") String token,
            @RequestParam("file") MultipartFile file) throws IOException {

        authService.requireAuth(token);

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are allowed"));
        }

        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : ".jpg";
        String filename = UUID.randomUUID().toString().replace("-", "") + ext;

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(filename)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        return ResponseEntity.ok(Map.of("url", "/api/uploads/" + filename));
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<byte[]> serve(@PathVariable String filename) {
        try {
            ResponseBytes<GetObjectResponse> obj = s3Client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(filename).build());

            String ct = obj.response().contentType();
            return ResponseEntity.ok()
                    .header("Cache-Control", "public, max-age=31536000, immutable")
                    .contentType(MediaType.parseMediaType(ct != null ? ct : "application/octet-stream"))
                    .body(obj.asByteArray());

        } catch (NoSuchKeyException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
