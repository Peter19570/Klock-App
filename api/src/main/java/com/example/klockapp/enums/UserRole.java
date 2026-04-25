package com.example.klockapp.enums;

public enum UserRole {
    /** Global access to all branches and company-wide reporting */
    SUPER_ADMIN,

    /** Localized access restricted to an assigned branch */
    ADMIN,

    /** Standard access for personal attendance and history */
    USER
}
