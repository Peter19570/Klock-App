package com.example.klockapp.model;

import com.example.klockapp.shared.model.BaseEntity;
import com.example.klockapp.enums.ClockOutType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "clock_events")
public class ClockEvent extends BaseEntity {

    @Column(nullable = false)
    private Instant clockInTime;

    @Column
    private Instant clockOutTime;

    @Enumerated(EnumType.STRING)
    private ClockOutType clockOutType;

    @Column
    private Double latitudeIn;

    @Column
    private Double longitudeIn;

    @Column
    private Boolean isDelaySync = false;

    @Column
    private Double siteDepartureDistance; // difference (in meters) btw clock out and clock-in distance

    @Column
    private Double entryProximityDistance; // how close to the branch the user clocked-in

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_session_id")
    private WorkSession workSession;
}
