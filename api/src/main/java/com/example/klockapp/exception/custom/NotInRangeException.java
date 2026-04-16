package com.example.klockapp.exception.custom;

public class NotInRangeException extends RuntimeException {
    public NotInRangeException(String message) {
        super(message);
    }
}
