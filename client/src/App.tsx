import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AdminPage from "@/pages/AdminPage";
import UserPage from "@/pages/UserPage";
import AllSessionsPage from "@/components/AllSessionsPage";
import { useAuth } from "@/context/AuthContext";
import { resolveHomeRoute } from "@/context/AuthContext";

/**
 * Wraps the login route: if the user is already authenticated, redirect them
 * to their home route so the back button can never strand them on the login page.
 */
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={resolveHomeRoute(user)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public — redirect away if already logged in */}
      <Route
        path="/"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route path="/onboarding" element={<OnboardingPage />} />

      <Route
        path="/admin"
        element={
          <>
            <Navbar />
            <AdminPage />
          </>
        }
      />
      <Route
        path="/dashboard"
        element={
          <>
            <Navbar />
            <UserPage />
          </>
        }
      />
      <Route
        path="/sessions"
        element={
          <>
            <Navbar />
            <AllSessionsPage />
          </>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
