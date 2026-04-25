package com.example.klockapp.service;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.UserCreationRequest;
import com.example.klockapp.dto.response.UserDetailResponse;
import com.example.klockapp.dto.response.UserResponse;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.exception.custom.AccessDeniedException;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.exception.custom.PasswordNotChangedException;
import com.example.klockapp.filter.UserFilter;
import com.example.klockapp.mapper.UserMapper;
import com.example.klockapp.model.Branch;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.BranchRepo;
import com.example.klockapp.repo.UserRepo;
import com.example.klockapp.specification.UserSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepo userRepo;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final BranchRepo branchRepo;

    @Value("${app.user.default.picture}")
    private String defaultPicture;

    /**
     * Retrieves the profile of the currently authenticated user.
     * Accessible by all roles for their own data
     */
    public UserDetailResponse getUserDetails(CustomUserPrincipal principal) {
        User user = userRepo.findById(principal.user().getId())
                .orElseThrow(() -> new NotFoundException("User not found"));

        return userMapper.toDetailDto(user);
    }

    /**
     * Admin/Super Admin: Lists users with dynamic filtering
     * Logic: Enforces branch isolation for local Admins
     */
    public Page<UserResponse> getAllUsers(
            Pageable pageable, UserFilter filter, CustomUserPrincipal principal) {
        // Role Enforcement Logic: If Admin, force filter to their managed branch
        if (principal.user().getRole() == UserRole.ADMIN) {
            // Force the filter to the Admin's own home branch to ensure branch isolation
            filter.setHomeBranchId(principal.user().getHomeBranch().getId());
        }

        // Super Admin can pass a null homeBranchId to see everyone globally
        return userRepo.findAll(UserSpecifications.withFilter(filter), pageable)
                .map(userMapper::toDto);
    }

    /**
     * Admin/Super Admin: Retrieves full details for a specific user.
     */
    public UserDetailResponse getUserDetailsAdmin(Long id, CustomUserPrincipal principal) {
        User user = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // Guardrail: Ensure local Admins don't peek at other branches
        if (principal.user().getRole() == UserRole.ADMIN &&
                !user.getHomeBranch().getId()
                        .equals(principal.user().getHomeBranch().getId())) {

            throw new AccessDeniedException("You do not have permission to view users outside your branch.");
        }
        return userMapper.toDetailDto(user);
    }

    /**
     * Super Admin: Transfer a user to a different home branch
     */
    @Transactional
    public void transferUser(Long userId, Long newBranchId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // This logic would involve finding the branch and setting it as the new homeBranch
        user.setHomeBranch(branchRepo.getReferenceById(newBranchId));
        userRepo.save(user);
    }

    /**
     * Super Admin: Delete a user from the system
     */
    @Transactional
    public void deleteUser(Long id) {
        userRepo.deleteById(id);
    }

    /**
     * Super Admin: Create a new User(USER | ADMIN | SUPER_ADMIN) and assign their home/managed branch.
     */
    @Transactional
    public UserDetailResponse createUser(UserCreationRequest request) {

        if (userRepo.existsByEmail(request.email())) {
            throw new IllegalStateException("Email already registered.");
        }

        Branch branch = branchRepo.findById(request.managedBranchId())
                .orElseThrow(() -> new NotFoundException("Target Branch not found."));

        User user = userMapper.toUserEntity(request);
        user.setPassword(passwordEncoder.encode(request.firstName().toLowerCase() + "@12345"));
        user.setRole(request.userRole());
        user.setPicture(defaultPicture);
        user.setHomeBranch(branch);    // This is the branch they manage

        return userMapper.toDetailDto(userRepo.save(user));
    }
}