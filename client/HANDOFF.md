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
|   ├── profile-dropdown.tsx
│   ├── animated-theme-toggle.tsx
│   ├── expand-map.tsx
│   └── splashed-push-notifications.tsx
│
├── components/
|   ├── AdminBranches.tsx           ← New file empty right now
│   ├── AdminDashboard.tsx          ← Tab-based: Dashboard / Users / Sessions / Branches
│   ├── UserDashboard.tsx           ← ✅ UPDATED: branches[] replaces single officeLat/Lng; clockOutType fix
│   ├── AllSessionsPage.tsx        ← Infinite scroll, user-facing
    ├── AdminOverview 
    ├── UserSessionsPage.tsx        <- New
│   ├── SessionHistory.tsx          ← Renders movements[] from WorkSession (SessionResponse)
│   ├── AdminMap.tsx                ← ✅ UPDATED:
│   ├── AdminUsers.tsx              ← User list, name + email search, homeBranchId filter
│   ├── AdminSessions.tsx           ← Sessions table, date range filter; 
│   ├── LocationSettings.tsx        ← ✅ UPDATED:  
    ├── CreateAdminModal.tsx   
│   └── Navbar.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── OnboardingPage.tsx
│   ├── AdminPage.tsx               ← SUPER_ADMIN and ADMIN both routed here; role gates inside
|   ├── AuditLogsPage.tsx
|   ├── UserLogsPage.tsx
│   └── UserPage.tsx
│
├── context/
│   ├── AuthContext.tsx             ← role: "USER" | "ADMIN" | "SUPER_ADMIN"
│   └── ThemeContext.tsx
│
├── hooks/
│   ├── useGeolocation.ts
│   ├── useAutoClockIn.ts           ← ✅ UPDATED:
│   ├── useAutoClockOut.ts          ← NEEDS UPDATE: same branches[] migration (send next)
│   └── useAdminWebSocket.ts        ← ✅ UPDATED: sessionState enum CLOCKED_IN/CLOCKED_OUT;
│
├── services/
│   ├── api.ts                      ← Axios instance, credentials: include
│   ├── sessionService.ts           ← ✅ UPDATED: WorkSession/ClockEvent structure; getActiveMovement(); 
|   ├── attendanceService.ts
│   ├── userService.ts              ← me / all (+ homeBranchId filter) / detail / delete / transferUser
|   ├── connectivityStore.ts
│   ├── branchService.ts            ← ✅ NEW: 
|   ├── offlineQueueService.ts      ← ✅ NEW
|   ├── offlineClockQueue.ts
|   ├── syncEngine.ts
│   └── locationService.ts          ← ⛔ DEPRECATED: replaced by branchService.ts
│
├── types/
│   └── index.ts                    ← ✅ UPDATED:
│
└── lib/
|   ├── roleUtils.ts                ← NEW
|   └── utils.ts                    ← cn(), haversineDistance()
|
├── App.tsx
├── index.css
├── main.tsx
```

