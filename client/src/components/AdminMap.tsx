import { useEffect, useRef } from 'react';
import type { UserMapEntry } from '../hooks/useAdminWebSocket';
import type { BranchResponse } from '../types';
import { haversineDistance } from '../lib/utils';

interface AdminMapProps {
  branches: BranchResponse[];
  liveUsers?: Map<string, UserMapEntry>;
  focusBranchId?: number | null;
  onFocusConsumed?: () => void;
  /** Called whenever the set of visible (in-perimeter) users changes */
  onVisibleCountChange?: (count: number) => void;
}

/**
 * Buffer beyond branch.radius (metres) where user is still shown but orange.
 * Outside radius + ORANGE_BUFFER_M → marker is hidden entirely.
 */
const ORANGE_BUFFER_M = 10;

/**
 * Status → marker fill color (within radius)
 *  clocked-in  → green
 *  clocked-out → red
 *  offline     → gray
 *
 * Any status → orange when user is in the buffer zone (radius < dist <= radius + 10m)
 */
const STATUS_COLOR: Record<string, string> = {
  'clocked-in':  '#22c55e',  // green-500
  'clocked-out': '#ef4444',  // red-500
  'offline':     '#9ca3af',  // gray-400
  'buffer':      '#f97316',  // orange-500
};

/**
 * Returns the zone classification for a user relative to a set of branches.
 *
 * SUPER_ADMIN passes all branches → user is visible if within any branch perimeter.
 * ADMIN passes their single branch → user is visible only if within that branch.
 *
 * Returns:
 *   'inside'  — within branch.radius of at least one branch
 *   'buffer'  — within branch.radius + ORANGE_BUFFER_M but outside radius
 *   'outside' — beyond every branch's buffer → hide marker
 *
 * Also returns the closest branch so we can label it in the tooltip.
 */
function classifyUser(
  lat: number,
  lng: number,
  branches: BranchResponse[],
): { zone: 'inside' | 'buffer' | 'outside'; branch: BranchResponse | null } {
  if (branches.length === 0) return { zone: 'outside', branch: null };

  let closestBranch: BranchResponse | null = null;
  let closestDist = Infinity;
  let bestZone: 'inside' | 'buffer' | 'outside' = 'outside';

  for (const b of branches) {
    const dist = haversineDistance(lat, lng, b.latitude, b.longitude);
    if (dist < closestDist) {
      closestDist = dist;
      closestBranch = b;
    }
    if (dist <= b.radius) {
      // inside wins over everything
      if (bestZone !== 'inside') {
        bestZone = 'inside';
        closestBranch = b;
        closestDist = dist;
      }
    } else if (dist <= b.radius + ORANGE_BUFFER_M && bestZone === 'outside') {
      bestZone = 'buffer';
      closestBranch = b;
      closestDist = dist;
    }
  }

  return { zone: bestZone, branch: closestBranch };
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

export function AdminMap({
  branches,
  liveUsers = new Map(),
  focusBranchId,
  onFocusConsumed,
  onVisibleCountChange,
}: AdminMapProps) {
  const mapRef           = useRef<HTMLDivElement>(null);
  const leafletMapRef    = useRef<L.Map | null>(null);
  const branchMarkersRef = useRef<Map<number, { marker: L.Marker; circle: L.Circle; bufferCircle: L.Circle }>>(new Map());
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
          // Subtle dashed buffer ring — shows the 10m orange zone boundary
          const bufferCircle = L.circle(latlng, {
            color: '#f97316', fillColor: 'transparent', fillOpacity: 0,
            weight: 1, dashArray: '4 4', radius: b.radius + ORANGE_BUFFER_M,
          }).addTo(map);
          branchMarkersRef.current.set(b.id, { marker, circle, bufferCircle });
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
          existing.bufferCircle.setLatLng(latlng);
          existing.bufferCircle.setRadius(b.radius + ORANGE_BUFFER_M);
        } else {
          const marker = L.marker(latlng, { icon: buildOfficeIcon(L) })
            .addTo(map)
            .bindTooltip(`<strong>${b.displayName}</strong>`, { sticky: false, permanent: false });
          const circle = L.circle(latlng, {
            color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.10, weight: 2, radius: b.radius,
          }).addTo(map);
          const bufferCircle = L.circle(latlng, {
            color: '#f97316', fillColor: 'transparent', fillOpacity: 0,
            weight: 1, dashArray: '4 4', radius: b.radius + ORANGE_BUFFER_M,
          }).addTo(map);
          branchMarkersRef.current.set(b.id, { marker, circle, bufferCircle });
        }
      });

      branchMarkersRef.current.forEach(({ marker, circle, bufferCircle }, id) => {
        if (!incoming.has(id)) {
          marker.remove(); circle.remove(); bufferCircle.remove();
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

  // ─── Sync live user markers (with distance filtering) ────────────────────
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      let visibleCount = 0;

      liveUsers.forEach((user, email) => {
        const { zone, branch: nearestBranch } = classifyUser(
          user.latitude,
          user.longitude,
          branches,
        );

        // Outside every branch buffer → remove marker and skip
        if (zone === 'outside') {
          const existing = userMarkersRef.current.get(email);
          if (existing) {
            existing.remove();
            userMarkersRef.current.delete(email);
          }
          return;
        }

        visibleCount++;

        // Determine marker color: buffer zone overrides status color
        const markerColor = zone === 'buffer'
          ? STATUS_COLOR['buffer']
          : (STATUS_COLOR[user.status] ?? STATUS_COLOR['offline']);

        const icon = buildPersonIcon(L, markerColor);
        const latlng: [number, number] = [user.latitude, user.longitude];

        const statusLabel =
          user.status === 'clocked-in'  ? 'Clocked In' :
          user.status === 'clocked-out' ? 'Clocked Out' :
          'Offline';

        const zoneLabel = zone === 'buffer'
          ? `<span style="color:#f97316;font-size:10px;">⚠ Near perimeter</span><br/>`
          : '';

        // Show branch name from the nearest branch we matched (not from payload)
        // so it's always accurate regardless of user's home branch assignment.
        const branchLine = nearestBranch
          ? `<span style="color:#9ca3af;font-size:10px;">📍 ${nearestBranch.displayName}</span><br/>`
          : '';

        const tooltipHtml = `
          <div style="font-family:sans-serif;font-size:12px;line-height:1.4;">
            <strong>${user.displayName || email}</strong><br/>
            ${branchLine}
            ${zoneLabel}
            <span style="color:${markerColor};font-size:11px;">● ${statusLabel}</span>
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

      // Remove markers for users no longer being broadcast
      userMarkersRef.current.forEach((marker, email) => {
        if (!liveUsers.has(email)) {
          marker.remove();
          userMarkersRef.current.delete(email);
        }
      });

      onVisibleCountChange?.(visibleCount);
    });
  }, [liveUsers, branches, onVisibleCountChange]);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-border">
      <div ref={mapRef} className="w-full h-full" style={{ minHeight: 360 }} />
    </div>
  );
}
