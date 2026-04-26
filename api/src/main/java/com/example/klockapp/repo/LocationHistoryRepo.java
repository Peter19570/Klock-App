package com.example.klockapp.repo;

import com.example.klockapp.model.LocationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface LocationHistoryRepo extends JpaRepository<LocationHistory, Long>
        , JpaSpecificationExecutor<LocationHistory> {

    Optional<LocationHistory> findByWorkDateAndUsedIsFalse(LocalDate workDate);
}
