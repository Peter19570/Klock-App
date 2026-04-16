package com.example.klockapp.exception.custom;

public class TooShortException extends RuntimeException {
    public TooShortException(String message) {
        super(message);
    }
}
