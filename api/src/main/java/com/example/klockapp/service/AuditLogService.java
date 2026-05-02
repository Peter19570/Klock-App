package com.example.klockapp.service;

import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.enums.AuditOption;
import com.example.klockapp.filter.AuditLogFilter;
import com.example.klockapp.mapper.AuditLogMapper;
import com.example.klockapp.model.AuditLog;
import com.example.klockapp.repo.AuditLogRepo;
import com.example.klockapp.specification.AuditLogSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@Transactional
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepo auditLogRepo;
    private final AuditLogMapper auditLogMapper;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createAudit(String fullName, Long userId, AuditOption type, Map<String, Object> auditInfo){
        AuditLog auditLog = AuditLog.builder()
                .fullName(fullName)
                .userId(userId)
                .type(type)
                .auditInfo(auditInfo)
                .build();
        auditLogMapper.toDto(auditLogRepo.save(auditLog));
    }

    /**
     * Get all logs in the database
     * */
    public Page<AuditLogResponse> showAllUserLogs(AuditLogFilter filter, Pageable pageable){
        Page<AuditLog> auditLogPage = auditLogRepo
                .findAll(AuditLogSpecification.withFilter(filter),pageable);
        return auditLogPage.map(auditLogMapper::toDto);
    }
}
