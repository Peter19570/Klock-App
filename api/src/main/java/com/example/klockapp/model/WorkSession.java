package com.example.klockapp.model;

import com.example.klockapp.common.BaseEntity;
import com.example.klockapp.enums.ArrivalStatus;
import com.example.klockapp.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "work_sessions")
public class WorkSession extends BaseEntity {

    @Column(nullable = false)
    private LocalDate workDate; // e.g., 2026-04-13

    private ArrivalStatus arrivalStatus = ArrivalStatus.ON_TIME;

    @Enumerated(EnumType.STRING)
    private SessionStatus status = SessionStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // The movements happened during this workday
    @OneToMany(mappedBy = "workSession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClockEvent> clockEvents = new ArrayList<>();
}