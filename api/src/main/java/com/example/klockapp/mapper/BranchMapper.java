package com.example.klockapp.mapper;

import com.example.klockapp.dto.request.BranchRequest;
import com.example.klockapp.dto.response.BranchDetailsResponse;
import com.example.klockapp.dto.response.BranchResponse;
import com.example.klockapp.model.Branch;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BranchMapper {

    // Lightweight response for dropdowns and Super Admin lists
    BranchResponse toDto(Branch branch);

    // Detailed response for the Super Admin Branch Dashboard
    @Mapping(target = "totalAssignedStaff", expression = "java(branch.getAssignedStaff().size())")
    @Mapping(target = "currentActiveCount", ignore = true) // Set manually in Service via Repo count
    @Mapping(target = "assignedStaff", source = "assignedStaff")
    @Mapping(target = "activeNow", ignore = true) // Hydrated in Service from ClockEventRepo
    BranchDetailsResponse toDetails(Branch branch);

    @Mapping(target = "id", ignore = true)
    Branch toEntity(BranchRequest request);

    @Mapping(target = "id", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(BranchRequest request, @MappingTarget Branch branch);
}
