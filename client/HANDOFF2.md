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

