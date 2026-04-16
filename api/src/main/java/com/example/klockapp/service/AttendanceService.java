package com.example.klockapp.service;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.ClockInRequest;
import com.example.klockapp.dto.request.ClockOutRequest;
import com.example.klockapp.dto.response.record.ClockEventResponse;
import com.example.klockapp.dto.response.record.SessionResponse;
import com.example.klockapp.enums.ClockOutType;
import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.filter.SessionFilter;
import com.example.klockapp.mapper.ClockEventMapper;
import com.example.klockapp.mapper.SessionMapper;
import com.example.klockapp.model.Branch;
import com.example.klockapp.model.ClockEvent;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import com.example.klockapp.repo.BranchRepo;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.WorkSessionRepo;
import com.example.klockapp.specification.WorkSessionSpecifications;
import com.example.klockapp.util.LocationUtility;
import lombok.RequiredArgsConstructor;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional
public class AttendanceService {

    private final WorkSessionRepo workSessionRepo;
    private final ClockEventRepo clockEventRepo;
    private final BranchRepo branchRepo;
    private final SessionMapper sessionMapper;
    private final ClockEventMapper clockEventMapper;

    /**
     * Smart Clock-In Logic:
     * 1. Iterates through branches to find a match[cite: 43].
     * 2. Enforces "No Double Clock-In" guardrail.
     * 3. Manages WorkSession (Parent) and ClockEvent (Child)[cite: 46, 48].
     */
    public ClockEventResponse clockIn(CustomUserPrincipal principal, ClockInRequest request)
            throws BadRequestException {
        User user = principal.user();

        // Guardrail: Prohibit double clock-in across the system [cite: 50, 51]
        if (clockEventRepo.existsByWorkSessionUserAndClockOutTimeIsNull(user)) {
            throw new
                    IllegalStateException("You must clock out of your current branch before clocking in elsewhere.");
        }

        // Smart Discovery: Backend iterates through branches and matches radius [cite: 43, 44]
        Branch targetBranch = branchRepo.findAll().stream()
                .filter(branch -> LocationUtility.isWithinRadius(
                        request.latitude(), request.longitude(),
                        branch.getLatitude(), branch.getLongitude(),
                        branch.getRadius()))
                .findFirst()
                .orElseThrow(() -> new
                        BadRequestException("You are not within the perimeter of any registered branch."));

        // Workday Container: Find today's session or create the first one [cite: 46, 47]
        WorkSession session = workSessionRepo.findByWorkDateAndUser(LocalDate.now(), user)
                .orElseGet(() -> {
                    WorkSession newSession = new WorkSession();
                    newSession.setWorkDate(LocalDate.now());
                    newSession.setUser(user);
                    newSession.setStatus(SessionStatus.ACTIVE);
                    return workSessionRepo.save(newSession);
                });

        // Create the individual Movement (ClockEvent) [cite: 48]
        ClockEvent event = clockEventMapper.toEntity(request);
        event.setWorkSession(session);
        event.setUser(user);
        event.setBranch(targetBranch);
        event.setClockInTime(Instant.now());

        return clockEventMapper.toDto(clockEventRepo.save(event));
    }

    /**
     * Clock-Out Logic:
     * Closes the active movement[cite: 9].
     */
    public ClockEventResponse clockOut(CustomUserPrincipal principal, ClockOutRequest request) {
        ClockEvent activeEvent = clockEventRepo
                .findByWorkSessionUserAndClockOutTimeIsNull(principal.user())
                .orElseThrow(() -> new NotFoundException("No active clock-in session found."));

        activeEvent.setClockOutTime(Instant.now());
        activeEvent.setClockOutType(request.clockOutType() != null ? request.clockOutType() : ClockOutType.MANUAL);

        return clockEventMapper.toDto(clockEventRepo.save(activeEvent));
    }

    public void undoClockOut(Long clockEventId) {
        ClockEvent event = clockEventRepo.findById(clockEventId)
                .orElseThrow(() -> new NotFoundException("Movement record not found."));
        event.setClockOutTime(null);
        event.setClockOutType(null);
        clockEventRepo.save(event);
    }

    /**
     * Personal History:
     * Fetches WorkSessions with nested movements for the user[cite: 9, 36].
     */
    @Transactional(readOnly = true)
    public Page<SessionResponse> getAllSessions(
            CustomUserPrincipal principal, Pageable pageable, SessionFilter filter) {

        UserRole role = principal.user().getRole(); // Assuming your principal exposes the enum [cite: 22]

        switch (role) {
            case USER -> {
                // Force personal scope: Only see own sessions [cite: 33, 36]
                filter.setUserId(principal.user().getId());
            }
            case ADMIN -> {
                // Force branch scope: See all sessions at their managed branch [cite: 28, 29, 53]
                // We clear any specific userId filter to ensure they see the whole branch
                filter.setUserId(null);
                filter.setBranchId(principal.user().getHomeBranch().getId());
            }
            case SUPER_ADMIN -> {
                // Global scope: Do nothing, allow the filter to use whatever is passed [cite: 23, 27]
                // They can optionally filter by a specific branch or user if they choose
            }
        }

        return workSessionRepo.findAll(WorkSessionSpecifications.withFilter(filter), pageable)
                .map(sessionMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Page<SessionResponse> getAllSessionsByUserId(Long id, Pageable pageable){
        Page<WorkSession> workSessionPage = workSessionRepo.findAllByUserId(id, pageable);
        return workSessionPage.map(sessionMapper::toDto);
    }

    @Transactional(readOnly = true)
    public boolean isActive(CustomUserPrincipal principal) {
        return clockEventRepo.existsByWorkSessionUserAndClockOutTimeIsNull(principal.user());
    }


}
