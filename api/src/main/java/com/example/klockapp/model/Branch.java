package com.example.klockapp.model;

import com.example.klockapp.shared.model.BaseEntity;
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
    private Double radius;

    @Column(nullable = false)
    private LocalTime shiftStart;

    @Column(nullable = false)
    private LocalTime shiftEnd;

    @Column(length = 15)
    private String support;

    private Long autoClockOutDuration; // seconds

    @Enumerated(EnumType.STRING)
    private BranchStatus branchStatus = BranchStatus.UNLOCKED;

    @OneToMany(mappedBy = "homeBranch")
    private List<User> assignedStaff = new ArrayList<>();

    @OneToMany(mappedBy = "branch", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ClockEvent> activities = new ArrayList<>();
}