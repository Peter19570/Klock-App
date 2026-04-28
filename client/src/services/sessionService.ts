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

// ─── Query params ──────────────────────────────────────────────────────────────

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
  // branchId filter removed from API — not included
}

// ─── User session endpoints ────────────────────────────────────────────────────

export const getUserSessions = (params: GetUserSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>('/api/v1/sessions', { params });

/** Backward-compat alias */
export const getAllSessions = getUserSessions;

// ─── Admin session endpoints ───────────────────────────────────────────────────

export const getUserSessionsById = ({ userId, ...params }: GetUserSessionsByIdParams) =>
  api.get<ApiResponse<PageResponse<SessionResponse>>>(`/api/v1/sessions/${userId}`, { params });

export const getAdminSessions = (params: GetAdminSessionsParams = {}) =>
  api.get<ApiResponse<PageResponse<AdminSessionResponse>>>('/api/v1/sessions', { params });

export const exportSessions = (start?: string, end?: string) =>
  api.get('/api/v1/sessions/export', {
    params: {
      ...(start && { start }),
      ...(end   && { end   }),
    },
    responseType: 'blob',
  });

// ─── Clock actions ────────────────────────────────────────────────────────────
//
// ClockInRequest (from API schema):
//   latitude, longitude, accuracy  — required
//   isDelaySync                    — true when submitting a queued offline event
//   clientTimeStamp                — HH:mm:ss of zone-entry or click time
//   deviceId, batteryLevel, signalStrength — optional diagnostics
//
// ClockOutRequest (from API schema):
//   clockOutType                   — 'MANUAL' | 'AUTOMATIC'
//   latitude, longitude            — required
//   clientTimeStamp, isDelaySync   — present on offline-queued events

export const clockIn = (data: ClockInRequest) =>
  api.post<ApiResponse<ClockEventResponse>>('/api/v1/sessions/start', data);

export const clockOut = (data: ClockOutRequest) =>
  api.put<ApiResponse<ClockEventResponse>>('/api/v1/sessions/end', data);

// ─── Status helpers ────────────────────────────────────────────────────────────

export const isActive = async (): Promise<boolean> => {
  const res     = await api.get<ApiResponse<boolean> | boolean>('/api/v1/sessions/active');
  const payload = res.data;
  if (typeof payload === 'boolean') return payload;
  if (payload && typeof (payload as ApiResponse<boolean>).data === 'boolean') {
    return (payload as ApiResponse<boolean>).data;
  }
  return false;
};

export const getTodaySession = async (): Promise<SessionResponse | null> => {
  const today = new Date().toISOString().split('T')[0];
  const res   = await getUserSessions({
    page: 0, size: 1,
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

// ─── Location history ─────────────────────────────────────────────────────────

export const sendLocationPing = (data: LocationRequest) =>
  api.post<void>('/api/v1/location/ping', data);

export const getLocationHistory = (
  userId: number,
  params: { minWorkDate?: string; maxWorkDate?: string } = {},
) =>
  api.get<ApiResponse<LocationResponse[]>>(`/api/v1/location/history/${userId}`, { params });

// ─── Offline sync (re-exported for convenience) ───────────────────────────────

/**
 * Flush all pending offline clock events (clock-in + clock-out) to the backend.
 * Can be called from a "Sync Now" button or from the sync scheduler.
 * Re-exported from syncEngine so callers only need one import.
 */
export { flushOfflineQueue as flushOfflineClockInQueue } from './syncEngine';

// ─── Audit logs (SUPER_ADMIN only) ────────────────────────────────────────────

export const getAllAuditLogs = (params?: Record<string, string>) =>
  api.get<ApiResponse<AuditLogResponse[]>>('/api/v1/audit', { params });

export const getUserAuditLogs = (userId: number) =>
  api.get<ApiResponse<AuditLogResponse[]>>(`/api/v1/audit/${userId}`);
