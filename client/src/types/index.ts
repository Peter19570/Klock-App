// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthRequest {
  email: string;
  password: string;
}

export interface PasswordRequest {
  password: string;
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
  role: UserRole;
  homeBranchName: string;
  homeBranchId?: number;
  createdAt: string;
  /** When true the user must change their password before using the app */
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
  /** Branch the new user/admin is assigned to */
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
}

/** POST /api/v1/branches/status/{id} */
export interface BranchStatusRequest {
  branchStatus: 'UNLOCKED' | 'LOCKED';
}

/** Compact branch reference used in paginated lists */
export interface BranchResponse {
  id: number;
  displayName: string;
  latitude: number;
  longitude: number;
  radius: number;
  /** Maps to branchStatus === 'LOCKED' from API */
  isLocked: boolean;
  branchStatus?: 'UNLOCKED' | 'LOCKED';
}

export interface BranchDetailsResponse {
  id: number;
  displayName: string;
  latitude?: number;
  longitude?: number;
  radius: number;
  isLocked: boolean;
  branchStatus?: 'UNLOCKED' | 'LOCKED';
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
}

export interface SessionResponse {
  id: number;
  workDate: string;
  sessionOwner?: string;
  status: 'ACTIVE' | 'COMPLETED';
  movements: ClockEventResponse[];
}

export interface AdminSessionResponse extends SessionResponse {
  user: UserResponse;
}

export interface ClockInRequest {
  latitude: number;
  longitude: number;
}

export interface ClockOutRequest {
  clockOutType: 'MANUAL' | 'AUTOMATIC';
}

// ─── Geolocation ──────────────────────────────────────────────────────────────
export interface GeoPosition {
  latitude: number;
  longitude: number;
  /** Accuracy in metres — populated by useGeolocation, may be absent elsewhere */
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
  /** May be absent on some backend versions — use email as the canonical key */
  userId?: number;
  displayName: string;
  email: string;
  latitude: number;
  longitude: number;
  /**
   * The Java backend sends space-separated values: "CLOCKED IN" | "CLOCKED OUT"
   * but may also send underscore variants.  resolveStatus() in useAdminWebSocket
   * normalises both forms — keep the union loose so TypeScript doesn't reject
   * the raw payload before normalisation.
   */
  sessionState: string;
  /** May be absent for ADMIN-scoped payloads that don't include branch metadata */
  branchId?: number;
  branchName?: string;
  timeStamp: string;
}