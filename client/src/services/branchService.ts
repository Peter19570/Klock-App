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

export const getAllBranches = (params: GetBranchesParams = {}) =>
  api.get<ApiResponse<PageResponse<BranchResponse>>>('/api/v1/branches/all', { params });

export const getBranchDetails = (id: number) =>
  api.get<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/${id}`);

export const getManagedBranch = (id: number) =>
  api.get<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/${id}/managed`);

// ─── Create / Update ──────────────────────────────────────────────────────────

export const createBranch = (data: BranchRequest) =>
  api.post<ApiResponse<BranchDetailsResponse>>('/api/v1/branches', data);

export const updateBranch = (id: number, data: BranchRequest) =>
  api.put<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/${id}`, data);

export const updateBranchRadius = (id: number, radius: number) =>
  api.put<ApiResponse<BranchDetailsResponse>>(
    `/api/v1/branches/${id}/radius`,
    null,
    { params: { radius } },
  );

/**
 * POST /api/v1/branches/status/{id}
 * SUPER_ADMIN only — lock or unlock a branch.
 * When LOCKED, ADMINs cannot edit any branch settings.
 */
export const setBranchStatus = (id: number, data: BranchStatusRequest) =>
  api.post<ApiResponse<void>>(`/api/v1/branches/status/${id}`, data);

export const deleteBranch = (id: number) =>
  api.delete(`/api/v1/branches/${id}`);
