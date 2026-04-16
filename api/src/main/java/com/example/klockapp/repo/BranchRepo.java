package com.example.klockapp.repo;

import com.example.klockapp.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BranchRepo extends JpaRepository<Branch, Long> {
    // Used for the "Smart" loop to iterate through all branch perimeters
    List<Branch> findAll();
}
