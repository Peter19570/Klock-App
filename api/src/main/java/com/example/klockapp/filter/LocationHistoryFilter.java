package com.example.klockapp.filter;

import com.example.klockapp.model.User;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationHistoryFilter {

    private LocalDate minWorkDate;

    private LocalDate maxWorkDate;

    private Long userId;

}
