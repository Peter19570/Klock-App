package com.example.klockapp.repo;

import com.example.klockapp.model.Branch;
import com.example.klockapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepo extends JpaRepository<Branch, Long> {
    // Used for the "Smart" loop to iterate through all branch perimeters
    List<Branch> findAll();

}
