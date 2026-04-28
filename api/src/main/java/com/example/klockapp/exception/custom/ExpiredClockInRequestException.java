package com.example.klockapp.exception.custom;

public class ExpiredClockInRequestException extends RuntimeException {
    public ExpiredClockInRequestException(String message) {
        super(message);
    }
}
