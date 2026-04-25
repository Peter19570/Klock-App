package com.example.klockapp.mapper;

import com.example.klockapp.dto.request.LocationRequest;
import com.example.klockapp.dto.response.LocationResponse;
import com.example.klockapp.model.LocationHistory;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface LocationMapper {

    LocationHistory toEntity(LocationRequest request);

    List<LocationResponse> toListDto(List<LocationHistory> locationHistories);
}
