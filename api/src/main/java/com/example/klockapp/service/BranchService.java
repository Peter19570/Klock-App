package com.example.klockapp.service;

import com.example.klockapp.dto.internal.CustomUserPrincipal;
import com.example.klockapp.dto.request.BranchRequest;
import com.example.klockapp.dto.request.BranchStatusRequest;
import com.example.klockapp.dto.response.BranchDetailsResponse;
import com.example.klockapp.dto.response.BranchResponse;
import com.example.klockapp.dto.response.UserResponse;
import com.example.klockapp.enums.BranchStatus;
import com.example.klockapp.exception.custom.AccessDeniedException;
import com.example.klockapp.exception.custom.NotFoundException;
import com.example.klockapp.mapper.BranchMapper;
import com.example.klockapp.mapper.UserMapper;
import com.example.klockapp.model.Branch;
import com.example.klockapp.model.User;
import com.example.klockapp.repo.BranchRepo;
import com.example.klockapp.repo.ClockEventRepo;
import com.example.klockapp.repo.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchService {

    private final BranchRepo branchRepo;
    private final UserRepo userRepo;
    private final ClockEventRepo clockEventRepo;
    private final BranchMapper branchMapper;
    private final UserMapper userMapper;

    /**
     * Super Admin: Creates a new office location.
     */
    @Transactional
    public BranchDetailsResponse createBranch(BranchRequest request) {
        Branch branch = branchMapper.toEntity(request);
        Branch savedBranch = branchRepo.save(branch);
        return getBranchDetails(savedBranch.getId());
    }

    public Page<BranchResponse> getAllBranches(Pageable pageable) {
        return branchRepo.findAll(pageable)
                .map(branchMapper::toDto);
    }

    /**
     * The Super Admin "Deep Dive" Dashboard logic.
     * Separates users stationed at a branch from those physically there now.
     */
    public BranchDetailsResponse getBranchDetails(Long branchId) {
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new NotFoundException("Branch not found"));

        // 1. Get Home Team: Users assigned to this home branch
        List<UserResponse> assignedStaff = userRepo.findAllByHomeBranchId(branchId)
                .stream()
                .map(userMapper::toDto)
                .toList();

        // 2. Get Active Now: Anyone (staff or visitor) currently clocked in here
        List<UserResponse> activeNow = clockEventRepo.findAllByBranchIdAndClockOutTimeIsNull(branchId)
                .stream()
                .map(event -> userMapper.toDto(event.getUser()))
                .toList();

        // 3. Return the Record using the full constructor
        return new BranchDetailsResponse(
                branch.getId(),
                branch.getDisplayName(),
                branch.getRadius(),
                branch.getBranchStatus(),
                branch.getAutoClockOutDuration(),
                branch.getLatitude(),
                branch.getLongitude(),
                branch.getShiftStart(),
                branch.getShiftEnd(),
                assignedStaff.size(), // totalAssignedStaff
                activeNow.size(),     // currentActiveCount
                assignedStaff,
                activeNow
        );
    }

    /**
     * Retrieves the branch details based on user role.
     * Super Admin: Can view any branch by ID.
     * Admin: Is locked to their homeBranchId.
     */
    public BranchDetailsResponse getAdminManagedBranch(
            CustomUserPrincipal principal, Long requestedBranchId) {
        Long branchToFetch;

        if (principal.getAuthorities().stream()
                .anyMatch(a -> Objects
                        .equals(a.getAuthority(), "ROLE_SUPER_ADMIN"))) {
            // Super Admin has global scope
            branchToFetch = requestedBranchId;
        } else {
            // Admin is localized to their assigned branch
            branchToFetch = principal.user().getHomeBranch().getId();
        }

        Branch branch = branchRepo.findById(branchToFetch)
                .orElseThrow(() -> new NotFoundException("Branch access denied or not found"));

        return branchMapper.toDetails(branch);
    }

    /**
     * Super Admin: Full metadata update for a branch.
     * Used when changing coordinates, display names, or global settings.
     */
    @Transactional
    public BranchDetailsResponse updateBranch(Long id, BranchRequest request) {
        Branch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Branch not found"));

        // Use the mapper to update the existing entity with new request data
        branchMapper.updateEntityFromRequest(request, branch);

        // Save and return the detailed dashboard view
        Branch updatedBranch = branchRepo.save(branch);
        return getBranchDetails(updatedBranch.getId());
    }

    /**
     * Admin/Super Admin: Update radius with "Final Word" check.
     */
    @Transactional
    public BranchDetailsResponse updateBranchRadius(Long id, Double newRadius, CustomUserPrincipal principal) {
        Branch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Branch not found"));

        // Logic: Admins can't change it if Super Admin locked it
        boolean isSuper = principal.getAuthorities().stream()
                .anyMatch(a -> Objects
                        .equals(a.getAuthority(), "ROLE_SUPER_ADMIN"));

        if (branch.getBranchStatus() == BranchStatus.LOCKED && !isSuper) {
            throw new AccessDeniedException("This branch configuration is locked by Super Admin");
        }

        branch.setRadius(newRadius);
        return getBranchDetails(branchRepo.save(branch).getId());
    }

    @Transactional
    public void deleteBranch(Long branchId) {
        Branch branch = branchRepo.findById(branchId)
                        .orElseThrow(() -> new NotFoundException("Branch not found"));

        for (User user : branch.getAssignedStaff()){
            user.setHomeBranch(null);
        }

        branchRepo.deleteById(branch.getId());
    }

    @Transactional
    public void setBranchStatus(BranchStatusRequest request, Long id){
        Branch branch = branchRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Branch not found"));

        branch.setBranchStatus(request.branchStatus());
        branchRepo.save(branch);
    }
}