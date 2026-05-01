package com.example.klockapp.mapper;

import com.example.klockapp.dto.request.AuthRequest;
import com.example.klockapp.dto.request.UserCreationRequest;
import com.example.klockapp.dto.request.UserUpdateRequest;
import com.example.klockapp.dto.response.UserDetailResponse;
import com.example.klockapp.dto.response.UserResponse;
import com.example.klockapp.model.User;
import org.mapstruct.*;
import org.springframework.web.bind.annotation.RequestBody;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    @Mapping(target = "homeBranchName", source = "homeBranch.displayName")
    UserResponse toDto(User user);

    @Mapping(target = "homeBranchName", source = "homeBranch.displayName")
    UserDetailResponse toDetailDto(User user);
//
//    @Mapping(target = "id", ignore = true)
//    User toEntity(AuthRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "fullName", expression = "java(request.firstName() + \" \" + request.lastName())")
    User toUserEntity(UserCreationRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromDto(@RequestBody UserUpdateRequest request, @MappingTarget User user);
}
