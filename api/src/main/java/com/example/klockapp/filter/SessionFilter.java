package com.example.klockapp.filter;

import com.example.klockapp.model.User;
import lombok.*;
import org.springframework.web.bind.support.SessionStatus;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionFilter {

    private LocalDate minWorkDate;

    private LocalDate maxWorkDate;

    private SessionStatus status;

    private Long userId;

    private Long branchId; // For Admin/Super Admin to see movements at a specific branch
}
