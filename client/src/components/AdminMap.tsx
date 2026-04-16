import { useEffect, useRef } from 'react';
import type { UserMapEntry } from '../hooks/useAdminWebSocket';
import type { BranchResponse } from '../types';

interface AdminMapProps {
  branches: BranchResponse[];
  liveUsers?: Map<string, UserMapEntry>;
  focusBranchId?: number | null;
  onFocusConsumed?: () => void;
}

/**
 * Status → marker fill color
 *  clocked-in  → green  (CLOCKED_IN from WS)
 *  clocked-out → red    (CLOCKED_OUT from WS, recently disconnected)
 *  offline     → gray   (no WS signal)
 */
const STATUS_COLOR: Record<string, string> = {
  'clocked-in':  '#22c55e',  // green-500
  'clocked-out': '#ef4444',  // red-500
  'offline':     '#9ca3af',  // gray-400
};

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Returns true if the user's coordinates fall within any branch perimeter */
function isWithinAnyBranch(
  lat: number,
  lng: number,
  branches: BranchResponse[],
): boolean {
  return branches.some(
    (b) => haversineMeters(lat, lng, b.latitude, b.longitude) <= b.radius,
  );
}

function buildPersonIcon(L: typeof import('leaflet'), color: string): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 24 30">
      <circle cx="12" cy="6" r="4.5" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="${color}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
      <polygon points="12,30 8,22 16,22" fill="${color}"/>
    </svg>
  `;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 36], iconAnchor: [14, 36], tooltipAnchor: [14, -4] });
}

function buildOfficeIcon(L: typeof import('leaflet')): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">
      <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8z"
            fill="#f59e0b" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="8" r="3" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({ html: svg, className: '', iconSize: [24, 32], iconAnchor: [12, 32], tooltipAnchor: [12, -4] });
}

export function AdminMap({ branches, liveUsers = new Map(), focusBranchId, onFocusConsumed }: AdminMapProps) {
  const mapRef           = useRef<HTMLDivElement>(null);
  const leafletMapRef    = useRef<L.Map | null>(null);
  const branchMarkersRef = useRef<Map<number, { marker: L.Marker; circle: L.Circle }>>(new Map());
  const userMarkersRef   = useRef<Map<string, L.Marker>>(new Map());

  const branchesRef = useRef(branches);
  useEffect(() => { branchesRef.current = branches; }, [branches]);

  // ─── One-time map init ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    let isCancelled = false;

    import('leaflet').then((L) => {
      if (isCancelled || leafletMapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const first   = branchesRef.current[0];
      const initLat = first?.latitude  ?? 0;
      const initLng = first?.longitude ?? 0;
      const initZoom = first ? 14 : 2;

      const map = L.map(mapRef.current!, { scrollWheelZoom: 'center' })
        .setView([initLat, initLng], initZoom);
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (branchesRef.current.length > 0) {
        branchesRef.current.forEach((b) => {
          const latlng: [number, number] = [b.latitude, b.longitude];
          const marker = L.marker(latlng, { icon: buildOfficeIcon(L) })
            .addTo(map)
            .bindTooltip(`<strong>${b.displayName}</strong>`, { sticky: false, permanent: false });
          const circle = L.circle(latlng, {
            color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.10, weight: 2, radius: b.radius,
          }).addTo(map);
          branchMarkersRef.current.set(b.id, { marker, circle });
        });

        if (branchesRef.current.length === 1) {
          map.setView([branchesRef.current[0].latitude, branchesRef.current[0].longitude], 16);
        } else {
          const latlngs = branchesRef.current.map((b): [number, number] => [b.latitude, b.longitude]);
          map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
        }
      }
    });

    return () => {
      isCancelled = true;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        branchMarkersRef.current.clear();
        userMarkersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync branch markers ──────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      const incoming = new Set(branches.map((b) => b.id));

      branches.forEach((b) => {
        const latlng: [number, number] = [b.latitude, b.longitude];
        const existing = branchMarkersRef.current.get(b.id);
        if (existing) {
          existing.marker.setLatLng(latlng);
          existing.marker.setTooltipContent(`<strong>${b.displayName}</strong>`);
          existing.circle.setLatLng(latlng);
          existing.circle.setRadius(b.radius);
        } else {
          const marker = L.marker(latlng, { icon: buildOfficeIcon(L) })
            .addTo(map)
            .bindTooltip(`<strong>${b.displayName}</strong>`, { sticky: false, permanent: false });
          const circle = L.circle(latlng, {
            color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.10, weight: 2, radius: b.radius,
          }).addTo(map);
          branchMarkersRef.current.set(b.id, { marker, circle });
        }
      });

      branchMarkersRef.current.forEach(({ marker, circle }, id) => {
        if (!incoming.has(id)) {
          marker.remove(); circle.remove();
          branchMarkersRef.current.delete(id);
        }
      });

      if (branches.length === 1) {
        map.setView([branches[0].latitude, branches[0].longitude], 16);
      } else if (branches.length > 1) {
        const latlngs = branches.map((b): [number, number] => [b.latitude, b.longitude]);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60] });
      }
    });
  }, [branches]);

  // ─── Pan to focused branch ────────────────────────────────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !focusBranchId) return;
    const branch = branches.find((b) => b.id === focusBranchId);
    if (branch) map.flyTo([branch.latitude, branch.longitude], 16, { duration: 1.2 });
    onFocusConsumed?.();
  }, [focusBranchId, branches, onFocusConsumed]);

  // ─── Sync live user markers (only within perimeter) ───────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      // Filter: only show users who are physically within a branch perimeter
      const usersInPerimeter = new Map<string, UserMapEntry>();
      liveUsers.forEach((user, email) => {
        if (isWithinAnyBranch(user.latitude, user.longitude, branchesRef.current)) {
          usersInPerimeter.set(email, user);
        }
      });

      usersInPerimeter.forEach((user, email) => {
        const latlng: [number, number] = [user.latitude, user.longitude];
        const color  = STATUS_COLOR[user.status] ?? STATUS_COLOR['offline'];
        const icon   = buildPersonIcon(L, color);

        const statusLabel =
          user.status === 'clocked-in'  ? 'Clocked In' :
          user.status === 'clocked-out' ? 'Clocked Out' :
          'Offline';

        const branchLine = user.branchName
          ? `<span style="color:#9ca3af;font-size:10px;">📍 ${user.branchName}</span><br/>`
          : '';

        const tooltipHtml = `
          <div style="font-family:sans-serif;font-size:12px;line-height:1.4;">
            <strong>${user.displayName || email}</strong><br/>
            ${branchLine}
            <span style="color:${color};font-size:11px;">● ${statusLabel}</span>
          </div>`;

        const existing = userMarkersRef.current.get(email);
        if (existing) {
          existing.setLatLng(latlng);
          existing.setIcon(icon);
          existing.setTooltipContent(tooltipHtml);
        } else {
          const marker = L.marker(latlng, { icon }).addTo(map);
          marker.bindTooltip(tooltipHtml, { sticky: true, permanent: false });
          userMarkersRef.current.set(email, marker);
        }
      });

      // Remove markers for users no longer in perimeter or disconnected
      userMarkersRef.current.forEach((marker, email) => {
        if (!usersInPerimeter.has(email)) {
          marker.remove();
          userMarkersRef.current.delete(email);
        }
      });
    });
  }, [liveUsers]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 360 }} />
    </div>
  );
}