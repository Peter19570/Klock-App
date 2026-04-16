package com.example.klockapp.exception.custom;

public class PasswordNotChangedException extends RuntimeException {
    public PasswordNotChangedException(String message) {
        super(message);
    }
}
