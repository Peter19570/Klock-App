package com.example.klockapp.enums;

public enum BranchStatus {
    /** Configuration (radius/location) can be edited by local Admins */
    UNLOCKED,

    /** Configuration can only be modified by a Super Admin. */
    LOCKED
}
