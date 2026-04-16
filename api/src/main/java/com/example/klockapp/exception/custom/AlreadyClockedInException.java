package com.example.klockapp.exception.custom;

public class AlreadyClockedInException extends RuntimeException {
    public AlreadyClockedInException(String message) {
        super(message);
    }
}
