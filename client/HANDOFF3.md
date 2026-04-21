# Klock App — Frontend Handoff (Multi-Branch Hierarchy)

## 📁 Project Structure

```
src/
├── components/ui/
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── separator.tsx
│   ├── checkbox.tsx
│   ├── card.tsx
│   ├── tabs.tsx
│   ├── step-card.tsx
│   ├── auth-form-1.tsx
│   ├── menu-button.tsx
│   ├── flow-hover-button.tsx
│   ├── orbital-loader.tsx
│   ├── animated-theme-toggle.tsx
│   ├── expand-map.tsx
│   └── splashed-push-notifications.tsx
│
├── components/
│   ├── AdminDashboard.tsx          ← Tab-based: Dashboard / Users / Sessions / Branches
│   ├── UserDashboard.tsx           ← ✅ UPDATED: branches[] replaces single officeLat/Lng; clockOutType fix
│   ├── AllSessionsPage.tsx        ← Infinite scroll, user-facing
    |-- AdminOverview 
    |-- UserSessionsPage.tsx        <- New
│   ├── SessionHistory.tsx          ← Renders movements[] from WorkSession (SessionResponse)
│   ├── AdminMap.tsx                ← ✅ UPDATED: branches[] prop; SUPER_ADMIN sees all branch pins + all users; ADMIN sees own branch pin + own users
│   ├── AdminUsers.tsx              ← User list, name + email search, homeBranchId filter
│   ├── AdminSessions.tsx           ← Sessions table, date range filter; uses AdminSessionResponse
│   ├── LocationSettings.tsx        ← ✅ UPDATED: branchId prop; isLockedForCurrentUser disables all inputs for ADMIN when 
    |-- CreateAdminModal.tsx    
isLocked===true
│   └── Navbar.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── AdminPage.tsx               ← SUPER_ADMIN and ADMIN both routed here; role gates inside
│   └── UserPage.tsx
│
├── context/
│   ├── AuthContext.tsx             ← role: "USER" | "ADMIN" | "SUPER_ADMIN"
│   └── ThemeContext.tsx
│
├── hooks/
│   ├── useGeolocation.ts
│   ├── useAutoClockIn.ts           ← ✅ UPDATED: accepts branches[] instead of single officeLat/Lng/radius; Smart Discovery — just passes GPS to backend
│   ├── useAutoClockOut.ts          ← NEEDS UPDATE: same branches[] migration (send next)
│   └── useAdminWebSocket.ts        ← ✅ UPDATED: sessionState enum CLOCKED_IN/CLOCKED_OUT; branchName/branchId on SUPER_ADMIN payloads; useUserLocationBroadcast sessionState fix
│
├── services/
│   ├── api.ts                      ← Axios instance, credentials: include
│   ├── sessionService.ts           ← ✅ UPDATED: WorkSession/ClockEvent structure; getActiveMovement(); hasManuallyClockedOutToday via movements[]
│   ├── userService.ts              ← me / all (+ homeBranchId filter) / detail / delete / transferUser
│   ├── branchService.ts            ← ✅ NEW: getAllBranches / getBranchDetails / createBranch / updateBranch / updateBranchRadius / deleteBranch
│   └── locationService.ts          ← ⛔ DEPRECATED: replaced by branchService.ts
│
├── types/
│   └── index.ts                    ← ✅ UPDATED: BranchResponse / BranchDetailsResponse / BranchRequest; ClockEventResponse (child); SessionResponse (WorkSession parent with movements[]); AdminSessionResponse; ClockInRequest; ClockOutRequest.clockOutType fix; AdminMapPayload with sessionState / displayName / branchId
│
└── lib/
    └── utils.ts                    ← cn(), haversineDistance()
```

## 🔑 Role Matrix

| Feature                        | SUPER_ADMIN | ADMIN   | USER |
|-------------------------------|-------------|---------|------|
| View all branches (map + list) | ✅           | ❌ own  | ❌   |
| Create / delete branch         | ✅           | ❌      | ❌   |
| Edit branch (name/lat/lng)     | ✅           | ❌      | ❌   |
| Edit branch radius             | ✅           | ✅ *    | ❌   |
| Lock/unlock branch radius      | ✅           | ❌      | ❌   |
| View all users                 | ✅           | ✅ own  | ❌   |
| Transfer user to branch        | ✅           | ❌      | ❌   |
| View all sessions              | ✅           | ✅ own  | ❌   |
| Live map (AdminMap)            | ✅ all       | ✅ own  | ❌   |
| Clock in/out (any branch)      | ❌           | ❌      | ✅   |

*Blocked by server when `isLocked === true`; `isLockedForCurrentUser` prop disables UI.

