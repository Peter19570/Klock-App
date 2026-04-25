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
  role: UserRole;
  homeBranchName: string;
  createdAt: string;
  mustChangePassword?: boolean;
}

/** Compact user reference used inside branch/session payloads */
export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  picture: string;
  homeBranchName?: string;
}

// ─── User creation (Super Admin only) ────────────────────────────────────────
export interface UserCreationRequest {
  email: string;
  firstName: string;
  lastName: string;
  managedBranchId?: number;
  userRole: UserRole;
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
}

/** POST /api/v1/branches/status/{id} */
export interface BranchStatusRequest {
  branchStatus: 'UNLOCKED' | 'LOCKED';
}

/**
 * Compact branch reference — returned by GET /api/v1/branches (paginated list).
 * NOTE: latitude/longitude are NOT in the API response for this type.
 * They are kept optional here so AdminMap / useAutoClockOut still compile
 * when the caller manually enriches the object (e.g. from BranchDetailsResponse).
 * Use branchStatus === 'LOCKED' to check lock state; isLocked is not sent by the API.
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
  totalAssignedStaff: number;
  currentActiveCount: number;
  assignedStaff: UserResponse[];
  activeNow: UserResponse[];
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

export interface AuditLogResponse {
  deviceId: string;
  batteryLevel: number;
  signalStrength: number;
  gpsAccuracy: number;
  clientTimeStamp: string;
  verified: boolean;
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
