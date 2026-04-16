package com.example.klockapp.mapper;

import com.example.klockapp.dto.request.ClockInRequest;
import com.example.klockapp.dto.response.record.ClockEventResponse;
import com.example.klockapp.model.ClockEvent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ClockEventMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "latitudeIn", source = "latitude")
    @Mapping(target = "longitudeIn", source = "longitude")
    ClockEvent toEntity(ClockInRequest request);

    @Mapping(target = "branchName", source = "branch.displayName")
    ClockEventResponse toDto(ClockEvent event);
}
