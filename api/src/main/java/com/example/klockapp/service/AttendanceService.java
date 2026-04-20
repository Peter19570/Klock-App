package com.example.klockapp.service;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.ClockInRequest;
import com.example.klockapp.dto.request.ClockOutRequest;
import com.example.klockapp.dto.response.ClockEventResponse;
import com.example.klockapp.dto.response.SessionResponse;
import com.example.klockapp.enums.ClockOutType;
import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.exception.custom.WriteToCSVException;
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
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.coyote.BadRequestException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Writer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;
import java.util.stream.Stream;

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

        session.setStatus(SessionStatus.ACTIVE);

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

        WorkSession session = workSessionRepo.findByWorkDateAndUser(LocalDate.now(), principal.user())
                        .orElseThrow(() -> new NotFoundException("Work Session not found"));

        Duration limit = Duration.ofMinutes(2);
        Duration eventDiff = Duration.between(activeEvent.getClockInTime(),Instant.now());

        // Check time diff btw the active clock and clock out to prevent recording accidental clock-ins
        if (eventDiff.compareTo(limit) < 0){
            clockEventRepo.delete(activeEvent);

            session.setStatus(SessionStatus.COMPLETED);
            return null;
        }

        activeEvent.setClockOutTime(Instant.now());
        activeEvent.setClockOutType(request.clockOutType() != null ? request.clockOutType() : ClockOutType.MANUAL);

        session.setStatus(SessionStatus.COMPLETED);

        return clockEventMapper.toDto(clockEventRepo.save(activeEvent));
    }

    /**
     * Undo clock-out logic to toggle on previously clocked-out clock-event, Not used in this system at the moment
     * */
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

        UserRole role = principal.user().getRole();

        // Check role before releasing the available sessions
        switch (role) {
            case USER -> {
                filter.setUserId(principal.user().getId());
            }
            case ADMIN -> {
                filter.setUserId(null);
                filter.setBranchId(principal.user().getHomeBranch().getId());
            }
            case SUPER_ADMIN -> {
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

    /**
     * Orchestrates the export by checking roles and filtering by branch.
     */
    @Transactional(readOnly = true)
    public void processExport(Writer writer, CustomUserPrincipal principal, LocalDate start, LocalDate end) {

        // 1. Identify if the user is a Super Admin
        boolean isSuperAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> Objects.equals(a.getAuthority(), "ROLE_SUPER_ADMIN"));

        // 2. Logic: Super Admin gets null (all branches),
        // Admin gets the ID of the branch they belong to.
        Long filterBranchId = isSuperAdmin ? null : principal.user().getHomeBranch().getId();

        // 3. Stream with the branch filter
        try (Stream<WorkSession> sessions = workSessionRepo.streamByBranchForExport(filterBranchId, start, end)) {
            writeToCsv(writer, sessions);
        }
    }

    private void writeToCsv(Writer writer, Stream<WorkSession> sessions) {
        CSVFormat format = CSVFormat.DEFAULT.builder()
                .setHeader("Date", "Staff Name", "Status", "Clock In", "Clock Out", "Type", "Branch")
                .build();

        try (CSVPrinter printer = new CSVPrinter(writer, format)) {
            sessions.forEach(session -> {
                String staffName = session.getUser().getFullName();

                for (ClockEvent event : session.getClockEvents()) {
                    try {
                        printer.printRecord(
                                session.getWorkDate(),
                                staffName,
                                session.getStatus(),
                                event.getClockInTime(),
                                event.getClockOutTime() != null ? event.getClockOutTime() : "STILL IN",
                                event.getClockOutType(),
                                event.getBranch().getDisplayName()
                        );
                    } catch (IOException e) {
                        throw new WriteToCSVException("CSV Row Write Error", e.getMessage());
                    }
                }
            });
            printer.flush();
        } catch (IOException e) {
            throw new WriteToCSVException("CSV Initialization Error", e.getMessage());
        }
    }

}
