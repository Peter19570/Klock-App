import api from './api';
import type {
  ApiResponse,
  PageResponse,
  UserResponse,
  UserDetailResponse,
  UserCreationRequest,
  AdminUpdateUserRequest,
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

// ─── Admin user management ─────────────────────────────────────────────────────

/**
 * PUT /api/v1/users/{id}
 * Admin — update a user's profile (first name, last name, email, role).
 */
export const updateUserProfile = (id: number, data: AdminUpdateUserRequest) =>
  api.put<ApiResponse<UserDetailResponse>>(`/api/v1/users/${id}`, data);

/**
 * PUT /api/v1/users/reset-password/{id}
 * Admin — trigger a password reset for the given user.
 * No request body; backend handles it internally.
 */
export const adminResetPassword = (id: number) =>
  api.put(`/api/v1/users/reset-password/${id}`);

/**
 * PUT /api/v1/users/reset-device-id/{id}
 * Admin — clear the stored device ID for the given user.
 * On next login the new device will be auto-registered.
 */
export const adminResetDeviceId = (id: number) =>
  api.put(`/api/v1/users/reset-device-id/${id}`);
