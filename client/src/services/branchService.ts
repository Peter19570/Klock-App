import api from './api';
import type {
  ApiResponse,
  PageResponse,
  BranchResponse,
  BranchDetailsResponse,
  BranchRequest,
  BranchStatusRequest,
} from '../types';

export interface GetBranchesParams {
  page?: number;
  size?: number;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

// FIXED: /api/v1/branches/all → /api/v1/branches
export const getAllBranches = (params: GetBranchesParams = {}) =>
  api.get<ApiResponse<PageResponse<BranchResponse>>>('/api/v1/branches', { params });

export const getBranchDetails = (id: number) =>
  api.get<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/${id}`);

// FIXED: /api/v1/branches/${id}/managed → /api/v1/branches/managed/${id}
export const getManagedBranch = (id: number) =>
  api.get<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/managed/${id}`);

// ─── Create / Update ──────────────────────────────────────────────────────────

export const createBranch = (data: BranchRequest) =>
  api.post<ApiResponse<BranchDetailsResponse>>('/api/v1/branches', data);

export const updateBranch = (id: number, data: BranchRequest) =>
  api.put<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/${id}`, data);

// FIXED: /api/v1/branches/${id}/radius → /api/v1/branches/radius/${id}
export const updateBranchRadius = (id: number, radius: number) =>
  api.put<ApiResponse<BranchDetailsResponse>>(
    `/api/v1/branches/radius/${id}`,
    null,
    { params: { radius } },
  );

export const setBranchStatus = (id: number, data: BranchStatusRequest) =>
  api.post<ApiResponse<void>>(`/api/v1/branches/status/${id}`, data);

export const deleteBranch = (id: number) =>
  api.delete(`/api/v1/branches/${id}`);
