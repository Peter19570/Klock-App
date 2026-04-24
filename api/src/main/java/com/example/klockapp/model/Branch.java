package com.example.klockapp.model;

import com.example.klockapp.common.BaseEntity;
import com.example.klockapp.enums.BranchStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "branches")
public class Branch extends BaseEntity {

    @Column(nullable = false)
    private String displayName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Double radius; // Geofence in meters

    @Column(nullable = false)
    private LocalTime shiftStart;

    @Column(nullable = false)
    private LocalTime shiftEnd;

    private Long autoClockOutDuration; // Minutes

    @Enumerated(EnumType.STRING)
    private BranchStatus branchStatus = BranchStatus.UNLOCKED; // Super Admin override

    @OneToMany(mappedBy = "homeBranch")
    private List<User> assignedStaff = new ArrayList<>();

    @OneToMany(mappedBy = "branch", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClockEvent> activities = new ArrayList<>();
}