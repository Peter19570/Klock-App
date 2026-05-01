package com.example.klockapp.controller;

import com.example.klockapp.shared.dto.response.ApiResponse;
import com.example.klockapp.dto.response.DashboardResponse;
import com.example.klockapp.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard")
public class DashBoardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<DashboardResponse>> getOverview(){
        DashboardResponse response = dashboardService.getAdminDashboard();
        return ResponseEntity.ok(new ApiResponse<>("Klock Overview", response));
    }
}
