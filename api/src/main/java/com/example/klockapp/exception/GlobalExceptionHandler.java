package com.example.klockapp.exception;

import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.exception.custom.*;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.security.SignatureException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<String>> handleNotFound(NotFoundException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>("Not Found", ex.getMessage()));
    }

    @ExceptionHandler(NotInRangeException.class)
    public ResponseEntity<ApiResponse<String>> handleNotInRange(NotInRangeException ex){
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>("Not In Range", ex.getMessage()));
    }

    @ExceptionHandler(SessionException.class)
    public ResponseEntity<ApiResponse<String>> handleSessionError(SessionException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Session Error", ex.getMessage()));
    }

    @ExceptionHandler(WeakSignalException.class)
    public ResponseEntity<ApiResponse<String>> handleWeakSignal(WeakSignalException ex){
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>("Weak Signal", ex.getMessage()));
    }

    @ExceptionHandler(AlreadyExistException.class)
    public ResponseEntity<ApiResponse<String>> handleAlreadyExist(AlreadyExistException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Already Exist", ex.getMessage()));
    }

    @ExceptionHandler(TooShortException.class)
    public ResponseEntity<ApiResponse<String>> handleTooShort(TooShortException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Too Short", ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<String>> handleBadCredentials(BadCredentialsException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Invalid Credentials", ex.getMessage()));
    }

    @ExceptionHandler(RevokedTokenException.class)
    public ResponseEntity<ApiResponse<String>> handleRevokedToken(RevokedTokenException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Token Revoked", ex.getMessage()));
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ApiResponse<String>> handleInvalidToken(InvalidTokenException ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>("Invalid Token", ex.getMessage()));
    }

    @ExceptionHandler(SignatureException.class)
    public ResponseEntity<ApiResponse<String>> handleInvalidToken(SignatureException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>("Invalid Signature", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<String>> handleInvalidToken(IllegalStateException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>("Illegal Signature", ex.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiResponse<String>> handleBadRequest(BadRequestException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>("Bad Request", ex.getMessage()));
    }

    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<ApiResponse<String>> handleInvalidToken(NullPointerException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>("Null Pointer", ex.getMessage()));
    }

    @ExceptionHandler(PasswordNotChangedException.class)
    public ResponseEntity<ApiResponse<String>> handlePasswordNotChanged(PasswordNotChangedException ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>("Weak Password In Use", ex.getMessage()));
    }
}
