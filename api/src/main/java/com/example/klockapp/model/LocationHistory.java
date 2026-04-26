package com.example.klockapp.model;

import com.example.klockapp.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "location_history")
public class LocationHistory extends BaseEntity {

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column
    private LocalDate workDate = LocalDate.now();

    @Column
    private Boolean used = false;

    @Column
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_session_id")
    private WorkSession workSession;
}
