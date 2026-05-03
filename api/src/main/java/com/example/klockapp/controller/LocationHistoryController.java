package com.example.klockapp.controller;

import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.dto.request.LocationRequest;
import com.example.klockapp.shared.dto.response.ApiResponse;
import com.example.klockapp.dto.response.LocationResponse;
import com.example.klockapp.filter.LocationHistoryFilter;
import com.example.klockapp.service.LocationHistoryService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/location")
@RequiredArgsConstructor
@Tag(name = "Location History")
public class LocationHistoryController {

    private final LocationHistoryService locationHistoryService;

    @PostMapping("/ping")
    public ResponseEntity<Void> saveUserLocation(
            @RequestBody @Valid LocationRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal){
        locationHistoryService.createLocationHistory(request, principal.user());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/history/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<ApiResponse<Page<LocationResponse>>> getLocationHistory(
            @PathVariable Long id,
            @RequestParam(required = false)LocalDate minWorkDate,
            @RequestParam(required = false)LocalDate maxWorkDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size){

        LocationHistoryFilter filter = LocationHistoryFilter.builder()
                .minWorkDate(minWorkDate)
                .maxWorkDate(maxWorkDate)
                .build();

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<LocationResponse> locationResponse = locationHistoryService
                .getLocationHistory(id, filter, pageable);

        return ResponseEntity.ok(new ApiResponse<>("User Location History", locationResponse));
    }
}
