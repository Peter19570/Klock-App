import api from './api';
import type {
  ApiResponse,
  PageResponse,
  UserResponse,
  UserDetailResponse,
  UserCreationRequest,
  PasswordRequest,
} from '../types';

export interface GetAllUsersParams {
  page?: number;
  size?: number;
  email?: string;
  fullName?: string;
  homeBranchId?: number;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getMe = () =>
  api.get<ApiResponse<UserDetailResponse>>('/api/v1/users/me');

export const getAllUsers = (params: GetAllUsersParams = {}) =>
  api.get<ApiResponse<PageResponse<UserResponse>>>('/api/v1/users', { params });

export const getUserDetail = (id: number) =>
  api.get<ApiResponse<UserDetailResponse>>(`/api/v1/users/${id}`);

// ─── Mutations ────────────────────────────────────────────────────────────────

export const deleteUser = (id: number) =>
  api.delete(`/api/v1/users/${id}`);

export const transferUser = (userId: number, newBranchId: number) =>
  api.put<ApiResponse<void>>(`/api/v1/users/transfer/${userId}`, null, {
    params: { newBranchId },
  });

/**
 * POST /api/v1/users
 * SUPER_ADMIN only — creates a new user (USER or ADMIN) with an
 * auto-generated password. The user must change it on first login.
 */
export const createUser = (data: UserCreationRequest) =>
  api.post<ApiResponse<UserDetailResponse>>('/api/v1/users', data);

/**
 * POST /api/v1/auth/reset-password
 * Change password — used on first login when mustChangePassword === true.
 * No user id needed; backend derives it from the JWT.
 */
export const changePassword = (data: PasswordRequest) =>
  api.post<ApiResponse<void>>('/api/v1/auth/reset-password', data);
