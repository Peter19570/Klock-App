package com.example.klockapp.controller;

import com.example.klockapp.shared.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.enums.AuditOption;
import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.service.AuditLogService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
@Tag(name = "Audit-Log")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> allLogs(
            @RequestParam(required = false)Instant minCreatedAt,
            @RequestParam(required = false) Instant maxCreatedAt,
            @RequestParam(required = false)AuditOption auditOption,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
            ){
        AuditLogFilter filter = AuditLogFilter.builder()
                .minCreatedAt(minCreatedAt)
                .maxCreatedAt(maxCreatedAt)
                .auditOption(auditOption)
                .build();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLogResponse> response = auditLogService.showAllUserLogs(filter, pageable);
        return ResponseEntity.ok(new ApiResponse<>("All Logs", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> allUserLogs(
            @PathVariable Long id,
            @RequestParam(required = false)Instant minCreatedAt,
            @RequestParam(required = false) Instant maxCreatedAt,
            @RequestParam(required = false)AuditOption auditOption,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size){
        AuditLogFilter filter = AuditLogFilter.builder()
                .minCreatedAt(minCreatedAt)
                .maxCreatedAt(maxCreatedAt)
                .auditOption(auditOption)
                .userId(id)
                .build();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLogResponse> response = auditLogService.showAllUserLogs(filter, pageable);
        return ResponseEntity.ok(new ApiResponse<>("All User Logs", response));
    }
}
