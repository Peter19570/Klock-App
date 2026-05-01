package com.example.klockapp.service;

import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.dto.request.LocationRequest;
import com.example.klockapp.dto.response.LocationResponse;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.filter.LocationHistoryFilter;
import com.example.klockapp.mapper.LocationHistoryMapper;
import com.example.klockapp.model.ClockEvent;
import com.example.klockapp.model.LocationHistory;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.LocationHistoryRepo;
import com.example.klockapp.repo.WorkSessionRepo;
import com.example.klockapp.specification.LocationHistorySpecification;
import com.example.klockapp.util.LocationUtility;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

@Service
@Transactional
@RequiredArgsConstructor
public class LocationHistoryService {

    private final LocationHistoryRepo locationHistoryRepo;
    private final WorkSessionRepo workSessionRepo;
    private final ClockEventRepo clockEventRepo;
    private final LocationHistoryMapper locationMapper;

    public void createLocationHistory(LocationRequest request, User user){
        WorkSession session = workSessionRepo
                .findByWorkDateAndUser(LocalDate.now(), user)
                .orElseThrow(() -> new NotFoundException("Work session not found"));

        ClockEvent clockEvent = clockEventRepo
                .findByWorkSessionUserAndClockOutTimeIsNull(user)
                .orElseThrow(() -> new NotFoundException("No clock-in record was found across all branches."));

        // Calculate the distance based on the available prev location points
        double distance = locationHistoryRepo.findByWorkDateAndUsedIsFalse(LocalDate.now())
                .map(loc -> {
                    loc.setUsed(true);
                    return LocationUtility.calculateDistance(
                            loc.getLatitude(), loc.getLongitude(),
                            request.latitude(), request.longitude());
                })
                .orElseGet(() ->
                        LocationUtility.calculateDistance(
                                clockEvent.getLatitudeIn(), clockEvent.getLongitudeIn(),
                                request.latitude(), request.longitude())
                );

        // Update distance covered for user in the db
        session.setTotalDistanceCovered(session.getTotalDistanceCovered() + distance);

        LocationHistory newLocationHistory = locationMapper.toEntity(request);
        newLocationHistory.setWorkSession(session);
        newLocationHistory.setUserId(user.getId());
        locationHistoryRepo.save(newLocationHistory);
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> getLocationHistory(
            Long userId, LocationHistoryFilter filter, CustomUserPrincipal principal){
        filter.setUserId(userId);

        boolean isSuperAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> Objects.equals(a.getAuthority(),
                        "ROLE_SUPER_ADMIN"));

        List<LocationHistory> locationHistories = locationHistoryRepo
                .findAll(LocationHistorySpecification.withFilter(filter));

        return locationMapper.toListDto(locationHistories);
    }
}
