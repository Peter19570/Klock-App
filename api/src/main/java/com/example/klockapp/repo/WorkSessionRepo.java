package com.example.klockapp.repo;

import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface WorkSessionRepo extends JpaRepository<WorkSession, Long>, JpaSpecificationExecutor<WorkSession> {

    // Finds the container for today to attach new movements (ClockEvents) [cite: 47, 49]
    Optional<WorkSession> findByWorkDateAndUser(LocalDate workDate, User user);

    // Standard workday history lookup [cite: 9]
    Page<WorkSession> findAllByUser(User user, Pageable pageable);

    Page<WorkSession> findAllByUserId(Long userId, Pageable pageable);

    Optional<WorkSession> findByWorkDate(LocalDate workDate, User user);
}
