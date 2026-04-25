package com.example.klockapp.controller;

import com.example.klockapp.dto.response.ApiResponse;
import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> allLogs(){
        List<AuditLogResponse> response = auditLogService.showAllLogs();
        return ResponseEntity.ok(new ApiResponse<>("All Logs", response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> allUserLogs(
            @PathVariable Long id){
        List<AuditLogResponse> response = auditLogService.showAllUserLogs(id);
        return ResponseEntity.ok(new ApiResponse<>("All User Logs", response));
    }
}
