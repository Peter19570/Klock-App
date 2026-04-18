package com.example.klockapp.model;

import com.example.klockapp.common.BaseEntity;
import com.example.klockapp.enums.UserRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "users")
public class User extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String firstName;
    private String lastName;
    private String fullName;
    private String picture;
    private String provider;
    private Boolean mustChangePassword = true;

    @Enumerated(EnumType.STRING)
    private UserRole role = UserRole.USER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_branch_id")
    private Branch homeBranch;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<WorkSession> workSessions = new ArrayList<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Token> tokens = new ArrayList<>();
}
