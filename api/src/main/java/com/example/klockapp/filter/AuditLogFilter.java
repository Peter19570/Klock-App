package com.example.klockapp.filter;

import com.example.klockapp.enums.AuditOption;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;


@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogFilter {
    private Instant minCreatedAt;

    private Instant maxCreatedAt;

    private AuditOption auditOption;

    private Long userId;

}
