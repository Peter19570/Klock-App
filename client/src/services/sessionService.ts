import api from './api';
import type {
  ClockInRequest,
  ClockOutRequest,
  ApiResponse,
  PageResponse,
  SessionResponse,
  AdminSessionResponse,
  ClockEventResponse,
} from '../types';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface GetUserSessionsParams {
  page?: number;
  size?: number;
  /** yyyy-MM-dd */
  minWorkDate?: string;
  /** yyyy-MM-dd */
  maxWorkDate?: string;
}

export interface GetUserSessionsByIdParams extends GetUserSessionsParams {
  userId: number;
}

export interface GetAdminSessionsParams extends GetUserSessionsParams {
  clockOutType?: 'MANUAL' | 'AUTOMATIC';
}

// ─── User endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/sessions/all
 * Returns the authenticated user's own workday history.
 */
export const getUserSessions = (params: GetUserSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>('/api/v1/sessions/all', { params });

/** Backward-compat alias */
export const getAllSessions = getUserSessions;

// ─── Admin endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/sessions/{id}
 * Returns paginated sessions for a specific user (admin use).
 */
export const getUserSessionsById = ({ userId, ...params }: GetUserSessionsByIdParams) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>(`/api/v1/sessions/${userId}`, { params });

/**
 * GET /api/v1/sessions/all  (admin authority)
 * ADMINs only see sessions for their own branch; SUPER_ADMINs see all.
 */
export const getAdminSessions = (params: GetAdminSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<AdminSessionResponse>>>(
    '/api/v1/sessions/all',
    { params },
  );

// ─── Clock actions ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/sessions/start
 * Smart Discovery: pass raw GPS — backend resolves the branch.
 */
export const clockIn = (data: ClockInRequest) =>
  api.post<ApiResponse<ClockEventResponse>>('/api/v1/sessions/start', data);

/**
 * PUT /api/v1/sessions/end
 * Body: { clockOutType: 'MANUAL' | 'AUTOMATIC' }
 */
export const clockOut = (data: ClockOutRequest) =>
  api.put<ApiResponse<ClockEventResponse>>('/api/v1/sessions/end', data);

/**
 * PUT /api/v1/sessions/undo/{id}
 * Reopens a ClockEvent (the ClockEvent id, not the WorkSession id).
 */
export const undoClockOut = (id: number) =>
  api.put(`/api/v1/sessions/undo/${id}`);

// ─── Status helpers ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/sessions/active
 * Returns true if the current user has an open ClockEvent (any branch).
 */
export const isActive = async (): Promise<boolean> => {
  const res = await api.get<ApiResponse<boolean> | boolean>('/api/v1/sessions/active');
  const payload = res.data;
  if (typeof payload === 'boolean') return payload;
  if (payload && typeof (payload as ApiResponse<boolean>).data === 'boolean') {
    return (payload as ApiResponse<boolean>).data;
  }
  return false;
};

/**
 * Returns the WorkSession for today if one exists, null otherwise.
 */
export const getTodaySession = async (): Promise<SessionResponse | null> => {
  const today = new Date().toISOString().split('T')[0];
  const res = await getUserSessions({
    page: 0,
    size: 1,
    minWorkDate: today,
    maxWorkDate: today,
  });
  const content = res.data.data?.content ?? [];
  return content.length > 0 ? content[0] : null;
};

/**
 * Returns the currently open ClockEvent within today's session, or null.
 */
export const getActiveMovement = async (): Promise<ClockEventResponse | null> => {
  const session = await getTodaySession();
  if (!session) return null;
  return session.movements.find((m) => m.clockOutTime === null) ?? null;
};

/**
 * Returns true if the user has at least one MANUAL clock-out today.
 */
export const hasManuallyClockedOutToday = async (): Promise<boolean> => {
  const session = await getTodaySession();
  if (!session) return false;
  return session.movements.some(
    (m) => m.clockOutType === 'MANUAL' && m.clockOutTime !== null,
  );
};
