package com.example.klockapp.service;

import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.mapper.AuditLogMapper;
import com.example.klockapp.model.AuditLog;
import com.example.klockapp.repo.AuditLogRepo;
import com.example.klockapp.specification.AuditLogSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepo auditLogRepo;
    private final AuditLogMapper auditLogMapper;

    /**
     * Get all logs in the database
     * */
    public Page<AuditLogResponse> showAllUserLogs(AuditLogFilter filter, Pageable pageable){
        Page<AuditLog> auditLogPage = auditLogRepo
                .findAll(AuditLogSpecification.withFilter(filter),pageable);
        return auditLogPage.map(auditLogMapper::toDto);
    }
}
