import api from './api';
import type {
  ApiResponse,
  PageResponse,
  BranchResponse,
  BranchDetailsResponse,
  BranchRequest,
  BranchStatusRequest,
  DashboardResponse,
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

// id is intentionally hardcoded to 0 by callers — backend resolves the
// admin's own branch from the JWT and ignores the id value.
export const getManagedBranch = (id: number) =>
  api.get<ApiResponse<BranchDetailsResponse>>(`/api/v1/branches/managed/${id}`);

// ─── Dashboard (unified overview) ────────────────────────────────────────────

/**
 * GET /api/v1/dashboard/overview
 * Single call that replaces:
 *   - GET /api/v1/users?size=1           (totalUsers)
 *   - GET /api/v1/sessions?size=200      (chart data, clock-out stats, today count)
 *   - GET /api/v1/branches/{id} × N      (per-branch staff counts)
 * Role-scoped on the backend: SUPER_ADMIN sees all branches, ADMIN sees own branch only.
 */
export const getDashboard = () =>
  api.get<ApiResponse<DashboardResponse>>('/api/v1/dashboard/overview');

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
