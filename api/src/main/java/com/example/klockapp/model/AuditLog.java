package com.example.klockapp.model;

import com.example.klockapp.common.BaseEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "audit_logs")
public class AuditLog extends BaseEntity {

    private String deviceId;
    private Integer batteryLevel;
    private Integer signalStrength;
    private Double gpsAccuracy;
    private LocalTime clientTimeStamp;
    private Boolean verified;
    private Long userId;
}
