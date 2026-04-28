package com.example.klockapp.controller;

import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.enums.AuditOption;
import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> allLogs(
            @RequestParam(required = false)Instant minCreatedAt,
            @RequestParam(required = false) Instant maxCreatedAt,
            @RequestParam(required = false)AuditOption auditOption
            ){
        AuditLogFilter filter = AuditLogFilter.builder()
                .minCreatedAt(minCreatedAt)
                .maxCreatedAt(maxCreatedAt)
                .auditOption(auditOption)
                .build();
        List<AuditLogResponse> response = auditLogService.showAllUserLogs(filter)
                .stream()
                .sorted(Comparator.comparing(AuditLogResponse::createdAt).reversed())
                .toList();
        return ResponseEntity.ok(new ApiResponse<>("All Logs", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> allUserLogs(
            @PathVariable Long id,
            @RequestParam(required = false)Instant minCreatedAt,
            @RequestParam(required = false) Instant maxCreatedAt,
            @RequestParam(required = false)AuditOption auditOption){
        AuditLogFilter filter = AuditLogFilter.builder()
                .minCreatedAt(minCreatedAt)
                .maxCreatedAt(maxCreatedAt)
                .auditOption(auditOption)
                .userId(id)
                .build();
        List<AuditLogResponse> response = auditLogService.showAllUserLogs(filter)
                .stream()
                .sorted(Comparator.comparing(AuditLogResponse::createdAt).reversed())
                .toList();
        return ResponseEntity.ok(new ApiResponse<>("All User Logs", response));
    }
}
