package com.example.klockapp.service;

import com.example.klockapp.enums.AuditOption;
import com.example.klockapp.shared.dto.response.CustomUserPrincipal;
import com.example.klockapp.dto.request.UserCreationRequest;
import com.example.klockapp.dto.request.UserUpdateRequest;
import com.example.klockapp.dto.response.UserDetailResponse;
import com.example.klockapp.dto.response.UserResponse;
import com.example.klockapp.enums.UserRole;
import com.example.klockapp.exception.custom.AccessDeniedException;
import com.example.klockapp.exception.custom.NotFoundException;
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

import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepo userRepo;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final BranchRepo branchRepo;
    private final AuditLogService auditLogService;

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
        if (principal.user().getRole() == UserRole.ADMIN) {
            filter.setHomeBranchId(principal.user().getHomeBranch().getId());
        }

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
        Branch newBranch = branchRepo.getReferenceById(newBranchId);

        auditLogService.createAudit(
                user.getFullName(),
                user.getId(),
                AuditOption.USER_UPDATED,
                Map.of("message", "User has been transferred from " +
                        user.getHomeBranch().getDisplayName() + " to " + newBranch.getDisplayName())
        );

        user.setHomeBranch(newBranch);
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

        if (UserRole.ADMIN.equals(request.userRole())
                || UserRole.SUPER_ADMIN.equals(request.userRole()) && null == request.phone()){
            throw new IllegalStateException("Admins and Super Admins must have phone not null");
        }

        Branch branch = branchRepo.findById(request.managedBranchId())
                .orElseThrow(() -> new NotFoundException("Target Branch not found."));

        User user = userMapper.toUserEntity(request);
        user.setPassword(passwordEncoder.encode(request.firstName().toLowerCase() + "@12345"));
        user.setRole(request.userRole());
        user.setPicture(defaultPicture);
        user.setPhone(request.phone());
        user.setHomeBranch(branch);

        auditLogService.createAudit(
                user.getFullName(),
                user.getId(),
                AuditOption.USER_CREATED,
                Map.of("message", "User created successfully.")
        );

        return userMapper.toDetailDto(userRepo.save(user));
    }

    /**
     * Super Admin: Update user's data including their device ID
     * */
    @Transactional
    public UserDetailResponse updateUser(UserUpdateRequest request, Long id){
        User user = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));

        if (UserRole.ADMIN.equals(request.userRole())
                || UserRole.SUPER_ADMIN.equals(request.userRole()) && null == request.phone()){
            throw new IllegalStateException("Admins and Super Admins must have phone not null");
        }

        auditLogService.createAudit(
                user.getFullName(),
                user.getId(),
                AuditOption.USER_UPDATED,
                Map.of("message", "User info updated successfully.")
        );

        userMapper.updateEntityFromDto(request, user);
        return userMapper.toDetailDto(user);
    }

    /**
     * Reset password for a user who has forgotten their password
     * */
    @Transactional
    public void resetUserPassword(Long id){
        User user = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setPassword(passwordEncoder.encode(user.getFirstName().toLowerCase()  + "@12345"));
        user.setMustChangePassword(true);

        auditLogService.createAudit(
                user.getFullName(),
                user.getId(),
                AuditOption.PASSWORD_RESET,
                Map.of("message", "User password reset successfully.")
        );
    }

    /**
     * Set user's device ID to null, next login captures the new device ID
     * */
    @Transactional
    public void resetUserDeviceId(Long id){
        User user = userRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setDeviceId("NOT SET");

        auditLogService.createAudit(
                user.getFullName(),
                user.getId(),
                AuditOption.DEVICE_ID_RESET,
                Map.of("message", "User device ID reset successfully.")
        );
    }

}