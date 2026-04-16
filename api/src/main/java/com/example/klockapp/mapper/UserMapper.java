package com.example.klockapp.mapper;

import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.UserCreationRequest;
import com.example.klockapp.dto.response.record.UserDetailResponse;
import com.example.klockapp.dto.response.record.UserResponse;
import com.example.klockapp.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(target = "homeBranchName", source = "homeBranch.displayName")
    UserResponse toDto(User user);

    @Mapping(target = "homeBranchName", source = "homeBranch.displayName")
    UserDetailResponse toDetailDto(User user);

    @Mapping(target = "id", ignore = true)
    User toEntity(AuthRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "fullName", expression = "java(request.firstName() + \" \" + request.lastName())")
    User toUserEntity(UserCreationRequest request);
}
