import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AdminPage from "@/pages/AdminPage";
import UserPage from "@/pages/UserPage";
import AllSessionsPage from "@/components/AllSessionsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
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
