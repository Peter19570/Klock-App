package com.example.klockapp.repo;

import com.example.klockapp.enums.UserRole;
import com.example.klockapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Used for the Super Admin Branch Dashboard: "Assigned Staff" [cite: 13]
    List<User> findAllByHomeBranchId(Long branchId);

    Boolean existsByRole(UserRole userRole);
}
