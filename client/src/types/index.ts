// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthRequest {
  email: string;
  password: string;
}

export interface PasswordRequest {
  password: string;
}

export interface DeviceIdRequest {
  deviceId: string;
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

// ─── Users ────────────────────────────────────────────────────────────────────

/** Returned by /me and /users/{id} */
export interface UserDetailResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  deviceId?: string | null;
  role: UserRole;
  homeBranchName: string;
  createdAt: string;
  mustChangePassword?: boolean;
  /** Contact phone number — required for ADMIN and SUPER_ADMIN roles */
  phone?: string | null;
}

/** Compact user reference used inside branch/session payloads */
export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  picture: string;
  homeBranchName?: string;
  role?: UserRole;
  /** Average distance (metres) from branch at clock-in across all sessions */
  avgEntryProximityDistance?: number | null;
  /** Contact phone number — present on admin/super-admin entries */
  phone?: string | null;
}

// ─── Admin user update ────────────────────────────────────────────────────────
export interface AdminUpdateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  /** Required when role is ADMIN or SUPER_ADMIN */
  phone?: string;
}

// ─── User creation (Super Admin only) ────────────────────────────────────────
export interface UserCreationRequest {
  email: string;
  firstName: string;
  lastName: string;
  managedBranchId?: number;
  userRole: UserRole;
  /** Required when userRole is ADMIN or SUPER_ADMIN */
  phone?: string;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface BranchRequest {
  displayName: string;
  latitude: number;
  longitude: number;
  radius: number;
  autoClockOutDuration?: number;
  shiftStart?: string;
  shiftEnd?: string;
  /** Support contact phone number for this branch */
  support?: string;
}

/** POST /api/v1/branches/status/{id} */
export interface BranchStatusRequest {
  branchStatus: 'UNLOCKED' | 'LOCKED';
}

/**
 * Compact branch reference — returned by GET /api/v1/branches (paginated list)
 * AND embedded inside DashboardResponse.branchSummaries.
 * NOTE: latitude/longitude are present in the dashboard payload but were
 * previously optional here. They remain optional for backward compat with
 * callers that build BranchResponse manually from paginated list results.
 */
export interface BranchResponse {
  id: number;
  displayName: string;
  radius: number;
  branchStatus: 'UNLOCKED' | 'LOCKED';
  shiftStart?: string;
  shiftEnd?: string;
  latitude?: number;
  longitude?: number;
  /** Enriched client-side from BranchDetailsResponse — used by useAutoClockOut */
  autoClockOutDuration?: number;
  /** Present in dashboard payload and GET /api/v1/branches list */
  totalAssignedStaff?: number;
  /** Present in dashboard payload and GET /api/v1/branches list */
  currentActiveCount?: number;
  /** Support contact phone number for this branch */
  support?: string | null;
}

export interface BranchDetailsResponse {
  id: number;
  displayName: string;
  latitude: number;
  longitude: number;
  radius: number;
  branchStatus: 'UNLOCKED' | 'LOCKED';
  autoClockOutDuration?: number;
  shiftStart?: string;
  shiftEnd?: string;
  /** Average clock-in distance across all users (metres) */
  avgDistance?: number | null;
  /** Display-friendly rounded average distance */
  displayAvg?: number | null;
  /** Backend-computed status string (e.g. "OPEN", "CLOSED") */
  status?: string | null;
  totalAssignedStaff: number;
  currentActiveCount: number;
  assignedStaff: UserResponse[];
  activeNow: UserResponse[];
  /** Support contact phone number for this branch */
  support?: string | null;
  /** Admins assigned to manage this branch */
  admins?: UserResponse[];
}

// ─── Sessions & Movements ─────────────────────────────────────────────────────

export interface ClockEventResponse {
  id: number;
  branchName: string;
  clockInTime: string;
  clockOutTime: string | null;
  clockOutType: 'MANUAL' | 'AUTOMATIC' | null;
  latitudeIn: number;
  longitudeIn: number;
  /** Clock-out coordinates — present once clocked out */
  latitudeOut?: number | null;
  longitudeOut?: number | null;
  /** Server-computed straight-line distance between clock-in and clock-out (metres) */
  distanceMeters?: number | null;
  /** How close (metres) the user was to the branch at the time of the clock event */
  entryProximityDistance?: number | null;
  /** Distance (metres) between the user's clock-in and clock-out locations */
  siteDepartureDistance?: number | null;
}

export interface SessionResponse {
  id: number;
  workDate: string;
  sessionOwner?: string;
  arrivalStatus?: 'EARLY' | 'ON_TIME' | 'LATE';
  status: 'ACTIVE' | 'COMPLETED';
  movements: ClockEventResponse[];
  /** Total distance across all movements for the session (metres) */
  totalDistanceMeters?: number | null;
}

// ─── Offline Queue ─────────────────────────────────────────────────────────────

export interface OfflineClockInEntry {
  id: string;           // local UUID
  payload: ClockInRequest & { isDelaySync: true };
  queuedAt: string;     // ISO timestamp when queued
}

export interface AdminSessionResponse extends SessionResponse {
  user: UserResponse;
}

export interface ClockInRequest {
  latitude: number;
  longitude: number;
  /** Required by new API */
  accuracy: number;
  isDelaySync?: boolean;
  deviceId?: string;
  batteryLevel?: number;
  signalStrength?: number;
  clientTimeStamp?: string;
}

export interface ClockOutRequest {
  clockOutType: 'MANUAL' | 'AUTOMATIC';
  /** Required by new API */
  latitude: number;
  /** Required by new API */
  longitude: number;
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface LocationRequest {
  latitude: number;
  longitude: number;
}

export interface LocationResponse {
  latitude: number;
  longitude: number;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export type AuditLogType =
  | 'CLOCK_IN_SUCCESS'
  | 'CLOCK_OUT_SUCCESS'
  | 'SUSPICIOUS_CLOCK_OUT'
  | 'DIFFERENT_DEVICE_DETECT'
  | 'AMBIGUOUS_CLOCK_EVENT'
  | 'LOGIN_SUCCESS'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'DEVICE_ID_RESET'
  | 'PASSWORD_RESET'
  | 'BRANCH_INFO_UPDATED';

export interface AuditLogResponse {
  id: number;
  fullName: string;
  userId: string;
  type: AuditLogType;
  createdAt: string;
  /** Dynamic key-value store — contents vary by event type */
  auditInfo: Record<string, unknown>;
}

// ─── Geolocation ──────────────────────────────────────────────────────────────
export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// ─── Generic API wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T> {
  message: string;
  data: T;
}

// ─── WebSocket / Live Map ─────────────────────────────────────────────────────
export interface AdminMapPayload {
  userId?: number;
  displayName: string;
  email: string;
  latitude: number;
  longitude: number;
  sessionState: string;
  branchId?: number;
  branchName?: string;
  timeStamp: string;
}

// ─── Dashboard (unified overview payload) ────────────────────────────────────

/**
 * One data point in the 7-day session trend array.
 * The backend guarantees all 7 days are present — days with no sessions have count: 0.
 * dayLabel is a pre-formatted short weekday name (e.g. "Mon", "Tue").
 */
export interface SessionTrend {
  date: string;      // yyyy-MM-dd
  dayLabel: string;  // e.g. "Mon"
  count: number;
}

/** Clock-out method breakdown from the dashboard payload */
export interface ClockOutStats {
  manual: number;
  automatic: number;
}

/**
 * Returned by GET /api/v1/admin/dashboard.
 * Replaces the old multi-call pattern in AdminOverview:
 *   - totalUsers      ← was: GET /api/v1/users?size=1
 *   - todaySessionCount ← was: derived from sessions list
 *   - clockOutStats   ← was: derived by iterating movements[]
 *   - sessionTrend    ← was: derived from GET /api/v1/sessions?size=200
 *   - branchSummaries ← was: N × getBranchDetails(id) calls
 *   - totalAssignedStaff / totalActiveStaff / lockedBranchCount ← were: derived client-side
 */
export interface DashboardResponse {
  totalUsers: number;
  todaySessionCount: number;
  totalAssignedStaff: number;
  totalActiveStaff: number;
  lockedBranchCount: number;
  clockOutStats: ClockOutStats;
  /** Pre-filled for exactly 7 days — zero-count days are included by the backend */
  sessionTrend: SessionTrend[];
  /** Branch-level summary with staff counts embedded — no extra detail calls needed */
  branchSummaries: BranchResponse[];
}
