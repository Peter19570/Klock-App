import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { AdminMapPayload } from "@/types";
import { tokenStore } from "@/services/api";

export type UserMapStatus = "clocked-in" | "clocked-out" | "offline";

export interface UserMapEntry extends AdminMapPayload {
  status: UserMapStatus;
}

const OFFLINE_THRESHOLD_MS = 60_000; // 60s without ping → offline

/**
 * Normalises the sessionState string coming from the backend.
 * The Java record sends:  "CLOCKED IN" | "CLOCKED OUT"  (space-separated)
 * Defensively also handles: "CLOCKED_IN" | "CLOCKED_OUT" (underscore)
 */
function resolveStatus(sessionState: string | undefined | null): UserMapStatus {
  if (!sessionState) return "offline";
  const normalised = sessionState.trim().toUpperCase().replace(/[\s_]+/g, "_");
  if (normalised === "CLOCKED_IN") return "clocked-in";
  if (normalised === "CLOCKED_OUT") return "clocked-out";
  return "offline";
}

/**
 * Builds the SockJS URL with the Bearer token appended as a query parameter.
 *
 * WHY: SockJS performs a plain HTTP upgrade handshake before STOMP begins.
 * Custom headers (like Authorization) are NOT sent during this HTTP phase —
 * only the URL is. Spring Security validates the token at the upgrade level,
 * so the token must travel on the URL.
 *
 * The backend's WebSocket security config should permit:
 *   .requestMatchers("/ws/**").permitAll()   ← let Spring's WS token extractor handle it
 * OR use a HandshakeInterceptor that reads the "token" query param.
 *
 * This is the industry-standard workaround for SockJS + JWT.
 */
function buildWsUrl(baseUrl: string): string {
  const token = tokenStore.getAccess();
  if (!token) return baseUrl;
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * useAdminWebSocket
 *
 * Subscribes to /topic/admin-map and maintains a live map of user locations.
 *
 * Role isolation is enforced server-side:
 *   SUPER_ADMIN → receives payloads from ALL branches (branchId/branchName present)
 *   ADMIN       → receives payloads only from their own branch
 *
 * The returned `users` map is keyed by email.
 */
export function useAdminWebSocket() {
  const [users, setUsers] = useState<Map<string, UserMapEntry>>(new Map());
  const clientRef = useRef<Client | null>(null);
  const stalePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL as string;
    if (!wsUrl) {
      console.error("[useAdminWebSocket] VITE_WS_URL is not set in .env");
      return;
    }

    const client = new Client({
      // ── KEY FIX ──────────────────────────────────────────────────────────
      // webSocketFactory is called fresh on every connect/reconnect attempt.
      // We build the URL here (with the current token as a query param) so
      // the SockJS HTTP handshake carries the token at the network level.
      // beforeConnect still sets connectHeaders as a belt-and-suspenders for
      // any STOMP-level auth the backend may also check.
      webSocketFactory: () => new SockJS(buildWsUrl(wsUrl)),
      reconnectDelay: 5000,

      beforeConnect: async () => {
        const token = tokenStore.getAccess();
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },

      onConnect: () => {
        console.log("[useAdminWebSocket] connected");

        client.subscribe("/topic/admin-map", (message) => {
          try {
            const payload: AdminMapPayload = JSON.parse(message.body);

            setUsers((prev) => {
              const next = new Map(prev);

              const status = resolveStatus(payload.sessionState);

              // The backend's LiveLocationResponse declares latitude/longitude
              // as String — always parseFloat regardless of what TS thinks.
              const latitude = parseFloat(payload.latitude as unknown as string);
              const longitude = parseFloat(payload.longitude as unknown as string);

              if (isNaN(latitude) || isNaN(longitude)) {
                console.warn("[useAdminWebSocket] received NaN coordinates, skipping", payload);
                return prev;
              }

              next.set(payload.email, {
                ...payload,
                latitude,
                longitude,
                status,
              });
              return next;
            });
          } catch (e) {
            console.error("[useAdminWebSocket] parse error", e);
          }
        });
      },
      onDisconnect: () => {
        console.log("[useAdminWebSocket] disconnected");
      },
      onStompError: (frame) => {
        console.error("[useAdminWebSocket] STOMP error", frame);
      },
    });

    client.activate();
    clientRef.current = client;

    // Mark users offline after 60s of silence
    stalePollRef.current = setInterval(() => {
      setUsers((prev) => {
        const next = new Map(prev);
        let changed = false;
        prev.forEach((entry, email) => {
          const age = Date.now() - new Date(entry.timeStamp).getTime();
          if (age > OFFLINE_THRESHOLD_MS && entry.status !== "offline") {
            next.set(email, { ...entry, status: "offline" });
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 30_000);

    return () => {
      client.deactivate();
      if (stalePollRef.current) clearInterval(stalePollRef.current);
    };
  }, []);

  return { users };
}

// ─────────────────────────────────────────────────────────────────────────────
// useUserLocationBroadcast
// ─────────────────────────────────────────────────────────────────────────────

interface BroadcastOptions {
  isClockedIn: boolean;
  position: { latitude: number; longitude: number } | null;
  email: string;
  intervalMs?: number;
}

export function useUserLocationBroadcast({
  isClockedIn,
  position,
  email,
  intervalMs = 15_000,
}: BroadcastOptions) {
  const clientRef = useRef<Client | null>(null);
  const connectedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const positionRef = useRef(position);
  const isClockedInRef = useRef(isClockedIn);
  useEffect(() => { positionRef.current = position; }, [position]);
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);

  const sendLocation = useCallback(() => {
    const client = clientRef.current;
    if (!client || !connectedRef.current) return;
    const pos = positionRef.current;
    if (!pos) return;

    // Match exactly what the backend's getSessionState() returns: "CLOCKED IN" / "CLOCKED OUT"
    const payload = {
      email,
      latitude: pos.latitude,
      longitude: pos.longitude,
      timeStamp: new Date().toISOString(),
      sessionState: isClockedInRef.current ? "CLOCKED IN" : "CLOCKED OUT",
    };

    client.publish({
      destination: "/app/send-location",
      body: JSON.stringify(payload),
    });
  }, [email]);

  // Send immediately when GPS position first resolves (or updates).
  useEffect(() => {
    if (!position) return;
    sendLocation();
  }, [position, sendLocation]);

  // Re-send immediately when clock state changes.
  useEffect(() => {
    sendLocation();
  }, [isClockedIn, sendLocation]);

  useEffect(() => {
    if (!email) return;

    const wsUrl = import.meta.env.VITE_WS_URL as string;
    if (!wsUrl) {
      console.error("[useUserLocationBroadcast] VITE_WS_URL is not set in .env");
      return;
    }

    const client = new Client({
      // ── KEY FIX ──────────────────────────────────────────────────────────
      // Same fix: build the URL with the token as a query param so the
      // SockJS HTTP handshake is authenticated before STOMP begins.
      webSocketFactory: () => new SockJS(buildWsUrl(wsUrl)),
      reconnectDelay: 5000,

      beforeConnect: async () => {
        const token = tokenStore.getAccess();
        client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      },

      onConnect: () => {
        connectedRef.current = true;
        sendLocation();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(sendLocation, intervalMs);
      },
      onDisconnect: () => {
        connectedRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      },
      onStompError: (frame) => {
        console.error("[useUserLocationBroadcast] STOMP error", frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      client.deactivate();
      connectedRef.current = false;
    };
  }, [email, intervalMs, sendLocation]);
}
