# Klock App — Frontend Handoff Notes (Updated)

## ✅ STATUS: SCAFFOLD UPDATED
All architecture changes from web-app-update.txt, API docs, and component snippets are reflected below.

---

## 📁 Project Structure

```
src/
├── components/ui/
│   ├── button.tsx                    ← shadcn Button (base) — from Menu snippet
│   ├── input.tsx                     ← shadcn Input
│   ├── label.tsx                     ← shadcn Label
│   ├── separator.tsx                 ← shadcn Separator
│   ├── checkbox.tsx                  ← shadcn Checkbox
│   ├── card.tsx                      ← shadcn Card
│   ├── tabs.tsx                      ← Base UI Tabs (underline variant) — from Tab switcher snippet
│   ├── step-card.tsx                 ← Progressive onboarding (firstName + lastName) — from Onboarding snippet
│   ├── auth-form-1.tsx               ← Login / Sign-up form with animation — from Auth snippet
│   ├── menu-button.tsx               ← Animated hamburger/X menu button — from Menu button snippet
│   ├── flow-hover-button.tsx         ← Animated Clock-in/out button
│   ├── orbital-loader.tsx            ← Loading spinner (framer-motion rings)
│   ├── animated-theme-toggle.tsx     ← Sun/moon dark mode toggle
│   ├── expand-map.tsx                ← 3D tilt map card (user location)
│   └── splashed-push-notifications.tsx ← Toast notifications (stackable)
│
├── components/
│   ├── AdminDashboard.tsx            ← Tab-based: Dashboard / Users / Sessions / Location Settings
│   ├── UserDashboard.tsx             ← Clock-in/out + last 20 sessions + "View All" button
│   ├── AllSessionsPage.tsx           ← NEW: Infinite scroll / lazy load sessions (no numbered pagination)
│   ├── SessionHistory.tsx            ← Fade-in session list (last 20)
│   ├── AdminMap.tsx                  ← Leaflet map: person icons (green/light-red/gray), live WebSocket
│   ├── AdminUsers.tsx                ← NEW: User list with name + email search filters
│   ├── AdminSessions.tsx             ← NEW: Sessions table with date range + clockOutType filters
│   ├── LocationSettings.tsx          ← NEW: Office info form — lat/lng/name disabled by default, unlock toggle + confirm
│   └── Navbar.tsx                    ← Top nav with theme toggle + user info (dark mode after login only)
│
├── pages/
│   ├── LoginPage.tsx                 ← Auth card centered, soft yellow→white background gradient (light only)
│   ├── OnboardingPage.tsx            ← Step card (firstName + lastName) shown if name not set after register
│   ├── AdminPage.tsx                 ← Role-gated admin route
│   └── UserPage.tsx                  ← Role-gated user route
│
├── context/
│   ├── AuthContext.tsx               ← Cookie-based auth (no token in JSON response), user info, roles
│   └── ThemeContext.tsx              ← Light/dark mode — ONLY active after login; default is light
│
├── hooks/
│   ├── useGeolocation.ts             ← Continuous position tracking
│   ├── useAutoClockIn.ts             ← Zone-entry → auto clock-in
│   ├── useAutoClockOut.ts            ← Zone-exit (duration from location API) → auto clock-out
│   └── useAdminWebSocket.ts          ← NEW: STOMP/SockJS subscription to /topic/admin-map
│
├── services/
│   ├── api.ts                        ← Axios instance — credentials: 'include' (cookie-based, no Bearer)
│   ├── sessionService.ts             ← clock-in / clock-out / getAll (paginated + filters)
│   ├── userService.ts                ← me / all (paginated + name/email filter) / detail / delete
│   └── locationService.ts           ← getInfo / update (PUT)
│
├── types/
│   └── index.ts                      ← All TS interfaces from Swagger (see Types section below)
│
└── lib/
    └── utils.ts                      ← cn() helper
```

---

## ⚙️ Setup Commands (Vite + React)

```bash
npm create vite@latest klock-app -- --template react-ts
cd klock-app
npm install

# Core
npm install axios react-router-dom framer-motion motion

# Map
npm install leaflet react-leaflet
npm install -D @types/leaflet

# WebSocket (STOMP over SockJS)
npm install @stomp/stompjs sockjs-client
npm install -D @types/sockjs-client

# UI / Tabs
npm install @base-ui/react
npm install class-variance-authority @radix-ui/react-slot lucide-react
npm install @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-checkbox

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Fonts (add to index.html)
# <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 🔑 ENV Variables Needed (.env)

```
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
VITE_OFFICE_LAT=5.6037
VITE_OFFICE_LNG=-0.1870
```

> ⚠️ Keycloak is removed. Auth is now fully handled by Spring Boot backend with **cookie-based sessions**.

---

## 🔐 Auth — IMPORTANT CHANGE

- **No Keycloak**. No `keycloak-js`. Remove all Keycloak references.
- Tokens are **not returned in API responses** — they are set as **HTTP-only cookies**.
- All Axios calls must use `withCredentials: true` (already set in `api.ts`).
- After login/register, check `GET /api/v1/users/me` to determine role and redirect.
- After register, call `/api/v1/users/me` — if `firstName` is null/empty → redirect to Onboarding.

---

## 🎨 Color Palette (index.css)

Primary amber `#f59e0b`. Full CSS vars below — copy directly into `src/index.css`:

```css
:root {
  --card: #ffffff;
  --ring: #f59e0b;
  --input: #e5e7eb;
  --muted: #f9fafb;
  --accent: #fffbeb;
  --border: #e5e7eb;
  --radius: 0.375rem;
  --popover: #ffffff;
  --primary: #f59e0b;
  --sidebar: #f9fafb;
  --secondary: #f3f4f6;
  --background: #ffffff;
  --foreground: #262626;
  --destructive: #ef4444;
  --muted-foreground: #6b7280;
  --accent-foreground: #92400e;
  --card-foreground: #262626;
  --popover-foreground: #262626;
  --primary-foreground: #000000;
  --secondary-foreground: #4b5563;
  --destructive-foreground: #ffffff;
}

.dark {
  --card: #262626;
  --ring: #f59e0b;
  --input: #404040;
  --muted: #262626;
  --accent: #92400e;
  --border: #404040;
  --popover: #262626;
  --primary: #f59e0b;
  --sidebar: #0f0f0f;
  --secondary: #262626;
  --background: #171717;
  --foreground: #e5e5e5;
  --destructive: #ef4444;
  --muted-foreground: #a3a3a3;
  --accent-foreground: #fde68a;
  --card-foreground: #e5e5e5;
  --popover-foreground: #e5e5e5;
  --primary-foreground: #000000;
  --secondary-foreground: #e5e5e5;
  --destructive-foreground: #ffffff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.3s ease, color 0.3s ease;
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
```

---

## 🖥️ Login / Sign-up Page

- Use `auth-form-1.tsx` snippet exactly as provided.
- Page background: soft yellow (`#fffbeb` / `--accent`) fading **upward** into white (`--background`).
  ```css
  background: linear-gradient(to top, #fffbeb, #ffffff);
  ```
- Auth card centered in the viewport.
- **No dark mode on this page** — always light, regardless of ThemeContext.
- The `forgot-password` view in the snippet is included but **not wired to a backend endpoint** (no such endpoint in API docs). Show a toast or placeholder message if triggered.
- Remove Google OAuth button from `AuthSocialButtons` — backend has no OAuth endpoint.

---

## 🪄 Onboarding (Post-Register)

- Use `step-card.tsx` snippet as the base animation/layout.
- **Adapt it**: only 2 steps (First Name → Last Name), not 3.
- On submit, call `POST /api/auth/v1/onboard` with `{ firstName, lastName }`.
- After success, redirect to user/admin dashboard based on role.

---

## 👤 User Dashboard

- Session history shows **last 20 sessions** (`size=20, page=0`).
- Keep scroll + fade animation.
- Add **"View All"** button at end of session list → navigates to `AllSessionsPage`.
- `AllSessionsPage`: infinite scroll with lazy loading. Fetch next page when user nears bottom. No numbered pagination buttons.

---

## 🛠️ Admin Dashboard

- Use `tabs.tsx` (underline variant) with tabs: **Dashboard | Users | Sessions | Location Settings**.
- On **small screens**: hide tab list, show `menu-button.tsx` hamburger → open a dropdown/sheet with tab options.

### Users Tab (`AdminUsers.tsx`)
- `GET /api/v1/users/all?page=&size=&email=&fullName=`
- Show paginated list of users.
- Filter inputs: **Full Name** (text search) + **Email** (text search).
- Each row has a delete action (`DELETE /api/v1/users/{id}`).
- Click row → fetch `GET /api/v1/users/{id}` for detail view.

### Sessions Tab (`AdminSessions.tsx`)
- `GET /api/v1/sessions/all?page=&size=&minWorkDate=&maxWorkDate=&clockOutType=`
- Shared endpoint with users — backend handles response differences.
- Filter options: date range (`minWorkDate` / `maxWorkDate`) + `clockOutType` (AUTOMATIC | MANUAL).
- Support infinite scroll or standard pagination (your choice).
- Undo clock-out: `PUT /api/v1/sessions/undo/{id}`.

### Location Settings Tab (`LocationSettings.tsx`)
- `GET /api/v1/locations/info` on mount.
- Fields: `displayName`, `latitude`, `longitude`, `radius`, `autoClockOutDuration`.
- `displayName`, `latitude`, `longitude` → **disabled/grayed by default**.
  - Show a checkbox or unlock button to enable editing.
  - When edited, show a confirmation dialog before calling `PUT /api/v1/locations/update`.
- `radius` and `autoClockOutDuration` → editable by default.
- Map preview: the perimeter circle updates **live as the radius slider/input changes** (before saving).

---

## 🗺️ Admin Map (Real-Time WebSocket)

### WebSocket Config
```
Endpoint:     ws://localhost:8080/ws   (STOMP over SockJS)
Subscribe to: /topic/admin-map
Send to:      /app/send-location
```

### Payload shape received from server
```json
{
  "email": "string",
  "latitude": 5.603,
  "longitude": -0.187,
  "timeStamp": "2025-01-01T00:00:00Z"
}
```

### User Icon Color Coding
| Status | Color |
|--------|-------|
| Clocked in | 🟢 Green |
| Clocked out | 🔴 Light red |
| Offline / no recent ping | ⚫ Gray |

- Use **person icons** (e.g. Lucide `User` icon rendered as a custom Leaflet divIcon), not plain dots.
- Track last seen timestamp per user to determine offline status.

### Hook: `useAdminWebSocket.ts`
```ts
// Connects via SockJS + STOMP
// Subscribes to /topic/admin-map
// Returns: Map<email, { lat, lng, status, timestamp }>
// Polls fallback (GET users/all) if WebSocket fails
```

---

## 🔔 Notifications (Stacking)

- When the same notification type fires multiple times, **stack them**.
- Newer toasts appear in front; older ones offset slightly behind.
- Use CSS `translate` + `scale` to create the stacked-card depth effect.

---

## 📱 Responsive / Mobile

- `tabs.tsx` underline switcher → visible on `md` and up.
- `menu-button.tsx` hamburger → visible on `sm` and below, opens a nav drawer/sheet with tab options.

---

## 🔄 API Reference (Condensed)

### Auth
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/auth/v1/login` | `{ email, password }` — sets cookie |
| POST | `/api/auth/v1/register` | `{ email, password }` — sets cookie |
| POST | `/api/auth/v1/onboard` | `{ firstName, lastName }` |
| POST | `/api/auth/refresh` | Refreshes session cookie |
| POST | `/api/auth/logout` | Clears session cookie |

### Users
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/users/me` | Current user info + role |
| GET | `/api/v1/users/all` | `?page&size&email&fullName` |
| GET | `/api/v1/users/{id}` | Admin only |
| DELETE | `/api/v1/users/{id}` | Admin only |

### Sessions
| Method | Endpoint | Notes |
|--------|----------|-------|
| POST | `/api/v1/sessions/start` | `{ latitude, longitude }` |
| PUT | `/api/v1/sessions/end` | `{ sessionType: AUTOMATIC\|MANUAL }` |
| PUT | `/api/v1/sessions/undo/{id}` | Undo clock-out |
| GET | `/api/v1/sessions/all` | `?page&size&minWorkDate&maxWorkDate&clockOutType` |

### Location
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/locations/info` | Office info (lat, lng, radius, autoClockOutDuration, displayName) |
| PUT | `/api/v1/locations/update` | Admin only — full LocationRequest body |

---

## 📐 TypeScript Interfaces (`src/types/index.ts`)

```ts
export interface AuthRequest { email: string; password: string; }
export interface OnBoardRequest { firstName: string; lastName: string; }

export interface UserDetailResponse {
  id: number; email: string; firstName: string; lastName: string;
  picture: string; role: 'USER' | 'ADMIN'; createdAt: string;
}
export interface UserResponse {
  id: number; email: string; fullName: string; picture: string;
}

export interface SessionResponse {
  id: number; workDate: string; clockInTime: string;
  clockOutTime: string; clockOutType: 'AUTOMATIC' | 'MANUAL';
}
export interface SessionRequest { longitude: number; latitude: number; }
export interface ClockOutRequest { sessionType: 'AUTOMATIC' | 'MANUAL'; }

export interface LocationResponse {
  radius: number; autoClockOutDuration: number;
  latitude: number; longitude: number; displayName: string;
}
export interface LocationRequest extends Partial<LocationResponse> {}

export interface PageResponse<T> {
  content: T[]; totalPages: number; totalElements: number;
  size: number; number: number; first: boolean; last: boolean;
}

export interface ApiResponse<T> { message: string; data: T; }

// WebSocket
export interface AdminMapPayload {
  email: string; latitude: number; longitude: number; timeStamp: string;
}
```

---

## 🚧 What's Left (Post-Handoff)

- [ ] Fill `VITE_API_BASE_URL` with real backend URL
- [ ] Fill `VITE_OFFICE_LAT` / `VITE_OFFICE_LNG` with real coordinates
- [ ] Add Leaflet CSS import to `main.tsx`: `import 'leaflet/dist/leaflet.css'`
- [ ] Fix Leaflet default marker icon (known Vite/webpack issue)
- [ ] Wire `auth-form-1.tsx` to real login/register API calls (remove Google OAuth button)
- [ ] Adapt `step-card.tsx` to 2-step onboarding (firstName + lastName only)
- [ ] Test cookie flow end-to-end (ensure `withCredentials: true` on all requests)
- [ ] Implement WebSocket with STOMP/SockJS for admin map live user locations
- [ ] Implement stacking notification UI
- [ ] Implement location settings lock/unlock + confirm flow
- [ ] Implement "View All Sessions" page with infinite scroll
