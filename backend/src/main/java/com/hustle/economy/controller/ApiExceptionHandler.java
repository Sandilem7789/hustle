package com.hustle.economy.controller;

import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Set<String> TOKEN_HEADERS = Set.of("X-Auth-Token", "X-Customer-Token", "X-Driver-Token");

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String message = status.is5xxServerError() ? "The request could not be completed" : exception.getReason();
        return ResponseEntity.status(status).body(error(message != null ? message : "Request failed", status));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, String>> notFound(EntityNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error("Resource not found", HttpStatus.NOT_FOUND));
    }

    // The services throw IllegalStateException with messages written for the person using the app
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> conflict(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error(exception.getMessage(), HttpStatus.CONFLICT));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, String>> missingHeader(MissingRequestHeaderException exception) {
        if (TOKEN_HEADERS.contains(exception.getHeaderName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(error("Invalid or expired session. Please log in again.", HttpStatus.UNAUTHORIZED));
        }
        return badRequest(exception);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, String>> badRequest(Exception exception) {
        return ResponseEntity.badRequest().body(error("Invalid request", HttpStatus.BAD_REQUEST));
    }

    // Anything else: keep Spring's status for its own errors (405, 404, 413...), never the raw message
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> unexpected(Exception exception) {
        if (exception instanceof ErrorResponse response && !response.getStatusCode().is5xxServerError()) {
            HttpStatus status = HttpStatus.valueOf(response.getStatusCode().value());
            return ResponseEntity.status(status).body(error(status.getReasonPhrase(), status));
        }
        log.error("Unhandled exception", exception);
        return ResponseEntity.internalServerError()
                .body(error("The request could not be completed", HttpStatus.INTERNAL_SERVER_ERROR));
    }

    private Map<String, String> error(String message, HttpStatus status) {
        return Map.of("message", message != null ? message : status.getReasonPhrase(), "code", status.name());
    }
}
