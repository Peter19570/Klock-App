package com.example.klockapp.mapper;

import com.example.klockapp.dto.response.record.SessionResponse;
import com.example.klockapp.model.WorkSession;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
        uses = { ClockEventMapper.class },
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SessionMapper {

    @Mapping(target = "movements", source = "clockEvents")
    // Ensure the status field is mapped directly if the types are the same
    @Mapping(target = "status", source = "status")
    @Mapping(target = "sessionOwner", expression = "java(session.getUser().getFullName())")
    SessionResponse toDto(WorkSession session);

}
