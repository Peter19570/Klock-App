/**
 * offlineQueueService.ts
 *
 * Full offline queue implementation using IndexedDB.
 * Handles both clock-in and clock-out pending events, session pairing,
 * expiry (24h), retry counting, and button-state reconstruction.
 *
 * Two object stores:
 *   - "pending_events"  : individual ClockIn / ClockOut events awaiting sync
 *   - "offline_sessions": pairs clock-in + clock-out into a session record
 *
 * Mapped to API schema:
 *   POST /api/v1/sessions/start  → ClockInRequest  (isDelaySync, clientTimeStamp, lat/lng/accuracy)
 *   PUT  /api/v1/sessions/end    → ClockOutRequest (clockOutType, lat/lng)
 */

// ─── Constants ─────────────────────────────────────────────────────────────────

export const DB_NAME    = 'klock_offline_db';
export const DB_VERSION = 1;
export const STORE_EVENTS   = 'pending_events';
export const STORE_SESSIONS = 'offline_sessions';

export const MAX_RETRY_COUNT = 5;
export const EXPIRY_MS       = 24 * 60 * 60 * 1000; // 24 hours

// ─── Types ─────────────────────────────────────────────────────────────────────

export type OfflineEventType = 'clock_in' | 'clock_out';

export type OfflineEventStatus =
  | 'pending'              // awaiting sync
  | 'synced'               // successfully submitted
  | 'failed'               // server rejected — needs manual intervention
  | 'expired';             // older than 24 hours, not synced

export type OfflineSessionStatus =
  | 'pending_in'           // clock-in queued, no clock-out yet
  | 'pending_pair'         // both clock-in and clock-out queued
  | 'completed'            // both synced
  | 'expired';             // at least one event expired

export interface PendingEvent {
  id: string;                   // UUID
  type: OfflineEventType;
  sessionId: string;            // links matching clock-in / clock-out pair
  clientTimestamp: string;      // ISO string — when user clicked
  serverTimestamp: string | null;
  latitude: number;
  longitude: number;
  accuracy: number;
  expiresAt: string;            // clientTimestamp + 24h, ISO string
  retryCount: number;           // 0-5
  status: OfflineEventStatus;
  failReason?: string;
  // clock-out only
  clockOutType?: 'MANUAL' | 'AUTOMATIC';
}

export interface OfflineSession {
  sessionId: string;
  clockInEventId: string;
  clockInTime: string;          // client ISO
  clockOutEventId: string | null;
  clockOutTime: string | null;
  status: OfflineSessionStatus;
}

/** Reconstructed button state — computed from all pending sessions */
export interface OfflineButtonState {
  disableClockIn: boolean;
  disableClockOut: boolean;
  pendingClockInCount: number;
  pendingClockOutCount: number;
  hasPendingPair: boolean;
}

// ─── DB bootstrap ──────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const es = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        es.createIndex('sessionId', 'sessionId', { unique: false });
        es.createIndex('status',    'status',    { unique: false });
        es.createIndex('type',      'type',      { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'sessionId' });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Generic IDB helpers ───────────────────────────────────────────────────────

function txGet<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror   = () => reject(req.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror   = () => reject(req.error);
  });
}

function txPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/** Atomically put into two stores. Both succeed or both fail. */
function txPutBoth(
  db: IDBDatabase,
  event: PendingEvent,
  session: OfflineSession,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS, STORE_SESSIONS], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.objectStore(STORE_EVENTS).put(event);
    tx.objectStore(STORE_SESSIONS).put(session);
  });
}

// ─── Dispatch helper ───────────────────────────────────────────────────────────

function dispatchQueueUpdate() {
  window.dispatchEvent(new Event('klock:queue-updated'));
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Enqueue a clock-in event. Creates a new offline session record.
 * Must succeed atomically — if IDB write fails we re-throw so the UI can
 * re-enable the button.
 */
export async function enqueueClockIn(params: {
  latitude: number;
  longitude: number;
  accuracy: number;
  clientTimestamp: string;
}): Promise<{ event: PendingEvent; session: OfflineSession }> {
  const db = await openDB();

  const sessionId = crypto.randomUUID();
  const eventId   = crypto.randomUUID();
  const expiresAt = new Date(
    new Date(params.clientTimestamp).getTime() + EXPIRY_MS,
  ).toISOString();

  const event: PendingEvent = {
    id:              eventId,
    type:            'clock_in',
    sessionId,
    clientTimestamp: params.clientTimestamp,
    serverTimestamp: null,
    latitude:        params.latitude,
    longitude:       params.longitude,
    accuracy:        params.accuracy,
    expiresAt,
    retryCount:      0,
    status:          'pending',
  };

  const session: OfflineSession = {
    sessionId,
    clockInEventId:  eventId,
    clockInTime:     params.clientTimestamp,
    clockOutEventId: null,
    clockOutTime:    null,
    status:          'pending_in',
  };

  await txPutBoth(db, event, session);
  dispatchQueueUpdate();
  return { event, session };
}

/**
 * Enqueue a clock-out event against an existing offline session.
 * The session must currently have status 'pending_in'.
 */
export async function enqueueClockOut(params: {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  clientTimestamp: string;
  clockOutType: 'MANUAL' | 'AUTOMATIC';
}): Promise<{ event: PendingEvent; session: OfflineSession }> {
  const db = await openDB();

  const session = await txGet<OfflineSession>(db, STORE_SESSIONS, params.sessionId);
  if (!session) throw new Error(`No offline session found for sessionId: ${params.sessionId}`);
  if (session.status !== 'pending_in') {
    throw new Error(`Session ${params.sessionId} is not in pending_in state (got: ${session.status})`);
  }

  const eventId   = crypto.randomUUID();
  const expiresAt = new Date(
    new Date(params.clientTimestamp).getTime() + EXPIRY_MS,
  ).toISOString();

  const event: PendingEvent = {
    id:              eventId,
    type:            'clock_out',
    sessionId:       params.sessionId,
    clientTimestamp: params.clientTimestamp,
    serverTimestamp: null,
    latitude:        params.latitude,
    longitude:       params.longitude,
    accuracy:        params.accuracy,
    expiresAt,
    retryCount:      0,
    status:          'pending',
    clockOutType:    params.clockOutType,
  };

  const updatedSession: OfflineSession = {
    ...session,
    clockOutEventId: eventId,
    clockOutTime:    params.clientTimestamp,
    status:          'pending_pair',
  };

  await txPutBoth(db, event, updatedSession);
  dispatchQueueUpdate();
  return { event, session: updatedSession };
}

/** Get all pending events sorted oldest-first (for sync ordering). */
export async function getPendingEvents(): Promise<PendingEvent[]> {
  const db = await openDB();
  const all = await txGetAll<PendingEvent>(db, STORE_EVENTS);
  return all
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.clientTimestamp.localeCompare(b.clientTimestamp));
}

/** Get all offline sessions. */
export async function getOfflineSessions(): Promise<OfflineSession[]> {
  const db = await openDB();
  return txGetAll<OfflineSession>(db, STORE_SESSIONS);
}

/** Update a single event's status (and optionally serverTimestamp). */
export async function updateEventStatus(
  eventId: string,
  status: OfflineEventStatus,
  opts?: { serverTimestamp?: string; failReason?: string },
): Promise<void> {
  const db  = await openDB();
  const evt = await txGet<PendingEvent>(db, STORE_EVENTS, eventId);
  if (!evt) return;
  await txPut(db, STORE_EVENTS, {
    ...evt,
    status,
    serverTimestamp: opts?.serverTimestamp ?? evt.serverTimestamp,
    failReason:      opts?.failReason      ?? evt.failReason,
  });
  dispatchQueueUpdate();
}

/** Increment retry count for an event. Returns the new count. */
export async function incrementRetry(eventId: string): Promise<number> {
  const db  = await openDB();
  const evt = await txGet<PendingEvent>(db, STORE_EVENTS, eventId);
  if (!evt) return 0;
  const next = evt.retryCount + 1;
  await txPut(db, STORE_EVENTS, { ...evt, retryCount: next });
  return next;
}

/**
 * Mark event as synced and immediately delete both the event and its parent
 * session in a single atomic transaction.
 *
 * Previously this only stamped status: 'synced' and relied on syncEngine to
 * call deleteEvent() afterwards. If anything threw between those two calls the
 * session record was left behind with status 'pending_in' / 'pending_pair',
 * keeping the offline banners and button-disable logic stuck forever.
 * Doing it all in one transaction eliminates that race entirely.
 */
export async function markEventSynced(
  eventId: string,
  _serverTimestamp: string,
): Promise<void> {
  const db  = await openDB();
  const evt = await txGet<PendingEvent>(db, STORE_EVENTS, eventId);
  if (!evt) return;

  // Delete event + session atomically — no intermediate 'synced' state needed
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS, STORE_SESSIONS], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.objectStore(STORE_EVENTS).delete(eventId);
    tx.objectStore(STORE_SESSIONS).delete(evt.sessionId);
  });

  dispatchQueueUpdate();
}

/**
 * Mark an event as permanently failed.
 * Also marks the parent session as failed so the UI can show a reason.
 */
export async function markEventFailed(
  eventId: string,
  reason: string,
): Promise<void> {
  const db  = await openDB();
  const evt = await txGet<PendingEvent>(db, STORE_EVENTS, eventId);
  if (!evt) return;

  await txPut(db, STORE_EVENTS, { ...evt, status: 'failed', failReason: reason });
  dispatchQueueUpdate();
}

/**
 * Run expiry cleanup. Call once on app load and daily thereafter.
 * Marks events older than 24h as 'expired', updates parent sessions.
 * Returns count of expired events so the UI can show a notification.
 */
export async function runExpiryCleanup(): Promise<number> {
  const db   = await openDB();
  const all  = await txGetAll<PendingEvent>(db, STORE_EVENTS);
  const now  = Date.now();
  let count  = 0;

  for (const evt of all) {
    if (evt.status !== 'pending') continue;
    if (new Date(evt.expiresAt).getTime() <= now) {
      await txPut(db, STORE_EVENTS, { ...evt, status: 'expired' });

      const session = await txGet<OfflineSession>(db, STORE_SESSIONS, evt.sessionId);
      if (session && session.status !== 'completed') {
        await txPut(db, STORE_SESSIONS, { ...session, status: 'expired' });
      }
      count++;
    }
  }

  if (count > 0) dispatchQueueUpdate();
  return count;
}

/**
 * Reconstruct button disable states from all active offline sessions.
 *
 * Rules (from upgrade spec):
 *   pending_in (clock-in queued, no clock-out yet)
 *     → disable clock-in, ENABLE clock-out
 *   pending_pair (both queued)
 *     → disable BOTH buttons
 *   no pending sessions
 *     → enable both (normal online logic takes over)
 */
export async function getOfflineButtonState(): Promise<OfflineButtonState> {
  const db       = await openDB();
  const sessions = await txGetAll<OfflineSession>(db, STORE_SESSIONS);

  const activeSessions = sessions.filter(
    (s) => s.status === 'pending_in' || s.status === 'pending_pair',
  );

  const hasPendingIn   = activeSessions.some((s) => s.status === 'pending_in');
  const hasPendingPair = activeSessions.some((s) => s.status === 'pending_pair');

  // Count individual pending events for the badge
  const events           = await txGetAll<PendingEvent>(db, STORE_EVENTS);
  const pendingEvents    = events.filter((e) => e.status === 'pending');
  const pendingClockIns  = pendingEvents.filter((e) => e.type === 'clock_in').length;
  const pendingClockOuts = pendingEvents.filter((e) => e.type === 'clock_out').length;

  return {
    // Can't clock in again if there's already a pending clock-in or a pair waiting
    disableClockIn:       hasPendingIn || hasPendingPair,
    // Can't clock out if there's nothing to clock out of, or pair already queued
    disableClockOut:      hasPendingPair || (!hasPendingIn && pendingClockIns === 0),
    pendingClockInCount:  pendingClockIns,
    pendingClockOutCount: pendingClockOuts,
    hasPendingPair,
  };
}

/**
 * Total count of pending (not yet synced) events — for the badge.
 * Sync-safe: returns 0 on any IDB error.
 */
export async function getPendingCount(): Promise<number> {
  try {
    const db     = await openDB();
    const events = await txGetAll<PendingEvent>(db, STORE_EVENTS);
    return events.filter((e) => e.status === 'pending').length;
  } catch {
    return 0;
  }
}

/**
 * Get the open offline session (pending_in — has clock-in, no clock-out).
 * Returns null if none exists.
 */
export async function getOpenOfflineSession(): Promise<OfflineSession | null> {
  const db       = await openDB();
  const sessions = await txGetAll<OfflineSession>(db, STORE_SESSIONS);
  return sessions.find((s) => s.status === 'pending_in') ?? null;
}

/**
 * Permanently remove an event from IDB, also removing its parent session.
 * Always called by syncEngine after markEventSynced — but since markEventSynced
 * now deletes both records atomically, this is a safe no-op if they're already
 * gone. It still handles the case where deleteEvent is called directly (e.g.
 * manual purge) without a prior markEventSynced.
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const db  = await openDB();
  const evt = await txGet<PendingEvent>(db, STORE_EVENTS, eventId);
  // Already deleted by markEventSynced — nothing to do
  if (!evt) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS, STORE_SESSIONS], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.objectStore(STORE_EVENTS).delete(eventId);
    tx.objectStore(STORE_SESSIONS).delete(evt.sessionId);
  });

  dispatchQueueUpdate();
}

/** Hard-clear everything (dev/test utility). */
export async function clearAllOfflineData(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_EVENTS, STORE_SESSIONS], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.objectStore(STORE_EVENTS).clear();
    tx.objectStore(STORE_SESSIONS).clear();
  });
  dispatchQueueUpdate();
}