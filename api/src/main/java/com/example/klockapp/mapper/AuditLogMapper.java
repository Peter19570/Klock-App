package com.example.klockapp.mapper;

import com.example.klockapp.dto.response.AuditLogResponse;
import com.example.klockapp.model.AuditLog;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AuditLogMapper {

    AuditLogResponse toDto(AuditLog auditLog);

    List<AuditLogResponse> toListDto(List<AuditLog> auditLogs);
}
