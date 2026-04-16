package com.example.klockapp.exception.custom;

public class InactiveSessionException extends RuntimeException {
    public InactiveSessionException(String message) {
        super(message);
    }
}
