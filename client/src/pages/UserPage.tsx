// src/pages/UserPage.tsx
// FIX: UserPage must NOT call useGeolocation() or useUserLocationBroadcast()
// here. UserDashboard already calls both internally. Having two instances of
// useGeolocation() creates two concurrent GPS watchPosition() watchers that
// fire on slightly different schedules, causing rapid alternating position
// updates → rapid re-renders → the status label and clock-in/out state
// flickering between "Clocked In" and "Clocked Out" on every refresh.
// Also, the old hardcoded `isClockedIn: true` was always broadcasting the user
// as clocked-in regardless of their actual session state.
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import UserDashboard from "@/components/UserDashboard";

export default function UserPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== "USER") return <Navigate to="/dashboard" replace />;

  return <UserDashboard />;
}
