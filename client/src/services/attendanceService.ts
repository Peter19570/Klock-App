import api from './api';
import type {
  AttendanceRequest,
  ClockOutRequest,
  AttendanceResponse,
  ApiResponse,
  PageResponse,
} from '../types';

/** POST /api/v1/attendance/clock-in */
export const clockIn = (data: AttendanceRequest) =>
  api.post<ApiResponse<AttendanceResponse>>('/api/v1/attendance/clock-in', data);

/** PUT /api/v1/attendance/clock-out */
export const clockOut = (data: ClockOutRequest) =>
  api.put<ApiResponse<AttendanceResponse>>('/api/v1/attendance/clock-out', data);

/** PUT /api/v1/attendance/undo/:id */
export const undoClockOut = (id: number) =>
  api.put(`/api/v1/attendance/undo/${id}`);

/** GET /api/v1/attendance/active → plain boolean */
export const isActive = async (): Promise<boolean> => {
  const res = await api.get<boolean>('/api/v1/attendance/active');
  return res.data;
};

/** GET /api/v1/attendance/all (paginated) */
export const getAllAttendances = (params: { page?: number; size?: number } = {}) =>
  api.get<ApiResponse<PageResponse<AttendanceResponse>>>('/api/v1/attendance/all', { params });
