package com.example.klockapp.repo;

import com.example.klockapp.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findAllByUserId(Long userId);
}
