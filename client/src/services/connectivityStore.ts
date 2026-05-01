/**
 * connectivityStore.ts
 *
 * Single source of truth for online/offline state.
 * Fixes the gap where navigator.onLine stays true during real network loss.
 *
 * Sources of truth (in priority order):
 *   1. Failed Axios requests (network error, no response) → definitely offline
 *   2. Successful Axios requests → definitely online
 *   3. Heartbeat ping every 30s → catches prolonged outages between requests
 *   4. navigator online/offline events → fast signal, but unreliable on real loss
 *
 * Usage:
 *   import { isOnline, onConnectivityChange } from './connectivityStore';
 *
 *   // read current state (synchronous)
 *   if (isOnline()) { ... }
 *
 *   // subscribe to changes
 *   const unsub = onConnectivityChange((online) => setIsOffline(!online));
 *   // call unsub() to unsubscribe
 */

// Ping Cloudflare's DNS — tiny, reliable, works from localhost, no auth.
// Using mode:'no-cors' so CORS never blocks it. We don't read the response,
// just care whether a response came back at all.
const HEARTBEAT_URL = 'https://1.1.1.1';
const HEARTBEAT_INTERVAL = 30_000;           // 30 seconds
const HEARTBEAT_TIMEOUT  = 5_000;            // 5 seconds before we call it offline

// ─── Internal state ───────────────────────────────────────────────────────────

let _online      = navigator.onLine;
let _heartbeatId: ReturnType<typeof setInterval> | null = null;
const _listeners = new Set<(online: boolean) => void>();

// ─── Public API ───────────────────────────────────────────────────────────────

export function isOnline(): boolean {
  return _online;
}

export function onConnectivityChange(cb: (online: boolean) => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function notify(online: boolean): void {
  if (online === _online) return; // no change — skip
  _online = online;
  _listeners.forEach((cb) => cb(online));
}

/** Mark as online — called by Axios response interceptor on success. */
export function markOnline(): void {
  notify(true);
}

/** Mark as offline — called by Axios response interceptor on network error. */
export function markOffline(): void {
  notify(false);
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

async function ping(): Promise<void> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT);
  try {
    // no-cors: skips preflight, response is opaque but we only care that
    // *something* came back — that proves internet is reachable.
    await fetch(HEARTBEAT_URL, {
      method:  'HEAD',
      cache:   'no-store',
      mode:    'no-cors',
      signal:  ctrl.signal,
    });
    clearTimeout(tid);
    markOnline();
  } catch {
    clearTimeout(tid);
    // fetch only throws when there's no response at all (network down, timeout)
    markOffline();
  }
}

// ─── Bootstrap (called once on app start) ────────────────────────────────────

export function startConnectivityMonitor(): () => void {
  // Native events as fast signals
  const handleOnline  = () => ping(); // verify with a real request
  const handleOffline = () => markOffline();
  window.addEventListener('online',  handleOnline);
  window.addEventListener('offline', handleOffline);

  // Heartbeat for prolonged outages
  _heartbeatId = setInterval(ping, HEARTBEAT_INTERVAL);

  // Initial check
  ping();

  return () => {
    window.removeEventListener('online',  handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (_heartbeatId) clearInterval(_heartbeatId);
    _heartbeatId = null;
  };
}
