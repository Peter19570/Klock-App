package com.example.klockapp.model;

import com.example.klockapp.shared.model.BaseEntity;
import com.example.klockapp.enums.AuditOption;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Builder
@AllArgsConstructor
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

    @Column
    private String fullName;

    @Column
    private Long userId;

    @Enumerated(EnumType.STRING)
    private AuditOption type;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> auditInfo = new HashMap<>();
}
