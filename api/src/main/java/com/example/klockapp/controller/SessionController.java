package com.example.klockapp.controller;

import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.dto.request.ClockInRequest;
import com.example.klockapp.shared.dto.response.ApiResponse;
import com.example.klockapp.dto.request.ClockOutRequest;
import com.example.klockapp.dto.response.ClockEventResponse;
import com.example.klockapp.dto.response.SessionResponse;
import com.example.klockapp.enums.ArrivalStatus;
import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.filter.SessionFilter;
import com.example.klockapp.service.AttendanceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Tag(name = "Session")
public class SessionController {

    private final AttendanceService attendanceService;

    /**
     * Smart Clock-In: Finds branch via radius matching and starts a session + event.
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ClockEventResponse>> startSession(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestBody @Valid ClockInRequest request) throws BadRequestException {

        ClockEventResponse response = attendanceService.clockIn(principal.user(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ApiResponse<>("Clock-in success", response));
    }

    /**
     * Clock-Out: Closes the currently active ClockEvent movement.
     */
    @PutMapping("/end")
    public ResponseEntity<ApiResponse<ClockEventResponse>> endSession(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestBody @Valid  ClockOutRequest request) {

        ClockEventResponse response = attendanceService.clockOut(principal.user(), request);
        return ResponseEntity.ok(new ApiResponse<>("Clock-out success", response));
    }

    /**
     * Personal or Administrative workday history with nested movements.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SessionResponse>>> getAllSessions(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) LocalDate minWorkDate,
            @RequestParam(required = false) LocalDate maxWorkDate,
            @RequestParam(required = false) SessionStatus sessionStatus,
            @RequestParam(required = false) ArrivalStatus arrivalStatus) {

        SessionFilter filter = SessionFilter.builder()
                .minWorkDate(minWorkDate)
                .maxWorkDate(maxWorkDate)
                .sessionStatus(sessionStatus)
                .arrivalStatus(arrivalStatus)
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
     * Boolean check to see if the user is currently "At Work" anywhere.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<Boolean>> isActive(
            @AuthenticationPrincipal CustomUserPrincipal principal) {

        boolean active = attendanceService.isActive(principal.user());
        return ResponseEntity.ok(new ApiResponse<>("Active status check", active));
    }

    /**
     * Export all session within a given time-frame.
     */
    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<Void> exportSessions(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            HttpServletResponse response) throws IOException {

        LocalDate startDate = (start != null) ? start : LocalDate.now().withDayOfMonth(1);
        LocalDate endDate = (end != null) ? end : LocalDate.now();

        // 1. Set standard CSV headers
        response.setContentType("text/csv");
        response.setCharacterEncoding("UTF-8");
        String filename = String.format("work_report_%s_to_%s.csv", startDate, endDate);
        response.setHeader("Content-Disposition", "attachment; filename=" + filename);

        // 2. Delegate everything else to the service
        attendanceService.processExport(response.getWriter(), principal, startDate, endDate);
        return ResponseEntity.ok().build();
    }
}