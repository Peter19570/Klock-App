package com.example.klockapp.filter;

import com.example.klockapp.enums.UserRole;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFilter {

    private String email;

    private String fullName;

    private UserRole role;

    private Long homeBranchId; // To see all users assigned to a specific office
}
