package com.example.klockapp.service;

import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.mapper.AuditLogMapper;
import com.example.klockapp.model.AuditLog;
import com.example.klockapp.repo.AuditLogRepo;
import com.example.klockapp.specification.AuditLogSpecification;
import lombok.RequiredArgsConstructor;
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
    public List<AuditLogResponse> showAllLogs(AuditLogFilter filter){
        List<AuditLog> auditLogs = auditLogRepo.findAll(AuditLogSpecification.withFilter(filter));
        return auditLogMapper.toListDto(auditLogs);
    }

    /**
     * Get all logs in the database that belong to a user
     * */
    public List<AuditLogResponse> showAllUserLogs(AuditLogFilter filter){
        List<AuditLog> auditLogs = auditLogRepo.findAll(AuditLogSpecification.withFilter(filter));
        return auditLogMapper.toListDto(auditLogs);
    }
}
