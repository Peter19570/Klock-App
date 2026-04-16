import api from './api';
import type { ApiResponse, LocationResponse, LocationRequest } from '../types';

export const getLocationInfo = () =>
  api.get<ApiResponse<LocationResponse>>('/api/v1/locations/info');

export const updateLocation = (data: LocationRequest) =>
  api.put<ApiResponse<LocationResponse>>('/api/v1/locations/update', data);
