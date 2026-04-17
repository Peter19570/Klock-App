package com.example.klockapp.exception.custom;

public class WriteToCSVException extends RuntimeException {
    public WriteToCSVException(String message, String eMessage) {
        super(message);
    }
}
