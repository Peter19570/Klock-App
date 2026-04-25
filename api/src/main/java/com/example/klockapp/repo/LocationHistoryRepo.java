package com.example.klockapp.repo;

import com.example.klockapp.model.LocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface LocationHistoryRepo extends JpaRepository<LocationHistory, Long> {

    Optional<LocationHistory> findByWorkDateAndUsedIsFalse(LocalDate workDate);
}
