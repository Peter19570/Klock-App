package com.example.klockapp.controller;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.ClockInRequest;
import com.example.klockapp.dto.response.record.ApiResponse;
import com.example.klockapp.dto.request.ClockOutRequest;
import com.example.klockapp.dto.response.record.ClockEventResponse;
import com.example.klockapp.dto.response.record.SessionResponse;
import com.example.klockapp.filter.SessionFilter;
import com.example.klockapp.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final AttendanceService attendanceService;

    /**
     * POST /api/v1/sessions/start
     * Smart Clock-In: Finds branch via radius matching and starts a session + event[cite: 8, 44, 45].
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ClockEventResponse>> startSession(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestBody ClockInRequest request) throws BadRequestException {

        ClockEventResponse response = attendanceService.clockIn(principal, request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Clock-in success", response));
    }

    /**
     * PUT /api/v1/sessions/end
     * Clock-Out: Closes the currently active ClockEvent movement[cite: 9, 49].
     */
    @PutMapping("/end")
    public ResponseEntity<ApiResponse<ClockEventResponse>> endSession(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestBody ClockOutRequest request) {

        ClockEventResponse response = attendanceService.clockOut(principal, request);
        return ResponseEntity.ok(new ApiResponse<>("Clock-out success", response));
    }

    /**
     * GET /api/v1/sessions/all
     * Personal or Administrative workday history with nested movements[cite: 9, 36].
     */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<Page<SessionResponse>>> getAllSessions(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) LocalDate minWorkDate,
            @RequestParam(required = false) LocalDate maxWorkDate) {

        SessionFilter filter = SessionFilter.builder()
                .minWorkDate(minWorkDate)
                .maxWorkDate(maxWorkDate)
                .build();

        Pageable pageable = PageRequest.of(page, size, Sort.by("workDate").descending());
        Page<SessionResponse> responses = attendanceService.getAllSessions(principal, pageable, filter);

        return ResponseEntity.ok(new ApiResponse<>("Work history retrieved", responses));
    }

    /**
     * Get a paginated list of a user's work sessions by using the id
     * */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<SessionResponse>>> getAllSessionsByUserId(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size){
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SessionResponse> response = attendanceService.getAllSessionsByUserId(id, pageable);
        return ResponseEntity
                .ok(new ApiResponse<>("All Sessions By User", response));
    }

    /**
     * GET /api/v1/sessions/active
     * Boolean check to see if the user is currently "At Work" anywhere[cite: 10, 51].
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<Boolean>> isActive(
            @AuthenticationPrincipal CustomUserPrincipal principal) {

        boolean active = attendanceService.isActive(principal);
        return ResponseEntity.ok(new ApiResponse<>("Active status check", active));
    }
}