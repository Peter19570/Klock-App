import api from './api';
import type {
  ClockInRequest,
  ClockOutRequest,
  ApiResponse,
  PageResponse,
  SessionResponse,
  AdminSessionResponse,
  ClockEventResponse,
  LocationRequest,
  LocationResponse,
  AuditLogResponse,
} from '../types';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface GetUserSessionsParams {
  page?: number;
  size?: number;
  minWorkDate?: string;
  maxWorkDate?: string;
  sessionStatus?: 'ACTIVE' | 'COMPLETED';
  arrivalStatus?: 'EARLY' | 'ON_TIME' | 'LATE';
}

export interface GetUserSessionsByIdParams extends GetUserSessionsParams {
  userId: number;
}

export interface GetAdminSessionsParams extends GetUserSessionsParams {
  // NOTE: branchId filter was removed from the new API — dropped here too
}

// ─── User endpoints ───────────────────────────────────────────────────────────

// FIXED: /api/v1/sessions/all → /api/v1/sessions
export const getUserSessions = (params: GetUserSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>('/api/v1/sessions', { params });

/** Backward-compat alias */
export const getAllSessions = getUserSessions;

// ─── Admin endpoints ──────────────────────────────────────────────────────────

export const getUserSessionsById = ({ userId, ...params }: GetUserSessionsByIdParams) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>(`/api/v1/sessions/${userId}`, { params });

// FIXED: /api/v1/sessions/all → /api/v1/sessions
export const getAdminSessions = (params: GetAdminSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<AdminSessionResponse>>>(
    '/api/v1/sessions',
    { params },
  );

export const exportSessions = (start?: string, end?: string) =>
  api.get('/api/v1/sessions/export', {
    params: {
      ...(start && { start }),
      ...(end && { end }),
    },
    responseType: 'blob',
  });

// ─── Clock actions ────────────────────────────────────────────────────────────

export const clockIn = (data: ClockInRequest) =>
  api.post<ApiResponse<ClockEventResponse>>('/api/v1/sessions/start', data);

// FIXED: ClockOutRequest now requires latitude + longitude
export const clockOut = (data: ClockOutRequest) =>
  api.put<ApiResponse<ClockEventResponse>>('/api/v1/sessions/end', data);

// ─── Status helpers ───────────────────────────────────────────────────────────

export const isActive = async (): Promise<boolean> => {
  const res = await api.get<ApiResponse<boolean> | boolean>('/api/v1/sessions/active');
  const payload = res.data;
  if (typeof payload === 'boolean') return payload;
  if (payload && typeof (payload as ApiResponse<boolean>).data === 'boolean') {
    return (payload as ApiResponse<boolean>).data;
  }
  return false;
};

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

export const getActiveMovement = async (): Promise<ClockEventResponse | null> => {
  const session = await getTodaySession();
  if (!session) return null;
  return session.movements.find((m) => m.clockOutTime === null) ?? null;
};

export const hasManuallyClockedOutToday = async (): Promise<boolean> => {
  const session = await getTodaySession();
  if (!session) return false;
  return session.movements.some(
    (m) => m.clockOutType === 'MANUAL' && m.clockOutTime !== null,
  );
};

// ─── Location History (NEW) ───────────────────────────────────────────────────

/** POST /api/v1/location/ping — send periodic location while clocked in */
export const sendLocationPing = (data: LocationRequest) =>
  api.post<void>('/api/v1/location/ping', data);

/** GET /api/v1/location/history/{id} — fetch a user's location history */
export const getLocationHistory = (
  userId: number,
  params: { minWorkDate?: string; maxWorkDate?: string } = {},
) =>
  api.get<ApiResponse<LocationResponse[]>>(`/api/v1/location/history/${userId}`, { params });

// ─── Offline Queue (re-exported for convenience) ──────────────────────────────

/**
 * Call this to manually flush any queued offline clock-ins.
 * The hook handles this automatically on `online` events, but you can
 * also call it from a UI button (e.g. "Retry pending syncs").
 */
export { flushOfflineClockInQueue } from '../hooks/useAutoClockIn';

// ─── Audit Log (NEW — SUPER_ADMIN only) ──────────────────────────────────────

/** GET /api/v1/audit — all audit logs (filterable by date, actionType, search) */
export const getAllAuditLogs = (params?: Record<string, string>) =>
  api.get<ApiResponse<AuditLogResponse[]>>('/api/v1/audit', { params });

/** GET /api/v1/audit/{id} — audit logs for a specific user */
export const getUserAuditLogs = (userId: number) =>
  api.get<ApiResponse<AuditLogResponse[]>>(`/api/v1/audit/${userId}`);
