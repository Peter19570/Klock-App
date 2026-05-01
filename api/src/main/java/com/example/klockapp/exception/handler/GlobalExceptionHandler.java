package com.example.klockapp.exception;

import com.cloudinary.Api;
import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.exception.custom.*;
import org.apache.coyote.BadRequestException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.security.SignatureException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGeneralError(Exception ex){
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(Exception ex){
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }


    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleUnauthorizedRequest(Exception ex){
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }

    @ExceptionHandler({
            BadRequestException.class,
            WriteToCSVException.class,
            ExpiredClockInRequestException.class,
            InvalidTokenException.class,
            RevokedTokenException.class,
            BadCredentialsException.class,
            AlreadyExistException.class,
            TooShortException.class,
            SessionException.class
    })
    public ResponseEntity<ApiResponse<?>> handleBadRequest(Exception ex){
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }

    @ExceptionHandler({
            PasswordNotChangedException.class,
            NullPointerException.class,
            IllegalStateException.class,
            SignatureException.class
    })
    public ResponseEntity<ApiResponse<?>> handleNotAcceptableRequest(Exception ex){
        return ResponseEntity
                .status(HttpStatus.NOT_ACCEPTABLE)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }

    @ExceptionHandler({
            WeakSignalException.class,
            NotInRangeException.class
    })
    public ResponseEntity<ApiResponse<?>> handleForbiddenException(Exception ex){
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse<>(ex.getMessage(), null));
    }
}
