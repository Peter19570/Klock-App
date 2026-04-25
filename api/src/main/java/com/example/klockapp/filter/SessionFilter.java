package com.example.klockapp.filter;

import com.example.klockapp.enums.ArrivalStatus;
import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.model.User;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionFilter {

    private LocalDate minWorkDate;

    private LocalDate maxWorkDate;

    private SessionStatus sessionStatus;

    private ArrivalStatus arrivalStatus;

    private Long userId;

    private Long branchId; // For Admin/Super Admin to see movements at a specific branch
}
