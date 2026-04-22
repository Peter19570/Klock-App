package com.example.klockapp.repo;

import com.example.klockapp.enums.SessionStatus;
import com.example.klockapp.model.User;
import com.example.klockapp.model.WorkSession;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.stream.Stream;

@Repository
public interface WorkSessionRepo extends JpaRepository<WorkSession, Long>, JpaSpecificationExecutor<WorkSession> {

    // Finds the container for today to attach new movements (ClockEvents)
    Optional<WorkSession> findByWorkDateAndUser(LocalDate workDate, User user);

    Page<WorkSession> findAllByUserId(Long userId, Pageable pageable);

    Optional<WorkSession> findByStatus(SessionStatus sessionStatus);

    @QueryHints(value = {
            @QueryHint(name = "org.hibernate.fetchSize", value = "100"),
            @QueryHint(name = "org.hibernate.readOnly", value = "true")
    })
    @Query("SELECT DISTINCT s FROM WorkSession s " +
            "JOIN FETCH s.user " +
            "JOIN FETCH s.clockEvents e " +
            "WHERE (:branchId IS NULL OR e.branch.id = :branchId) " +
            "AND s.workDate BETWEEN :start AND :end")
    Stream<WorkSession> streamByBranchForExport(
            @Param("branchId") Long branchId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end
    );

}
