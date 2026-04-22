package com.example.klockapp.enums;

public enum ArrivalStatus {
    /**
     * Mark when a user arrives at a branch/clock-in before branch start shift time
     * */
    EARLY,

    /**
     * Mark when a user arrives 5 mins after branch start shift time
     * */
    ON_TIME,

    /**
     * Mark when a user arrives after branch start shift time and has exceeded the 5mins grace period
     * */
    LATE
}
