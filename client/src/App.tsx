import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Navbar } from "@/components/Navbar"; // Add this import
import LoginPage from "@/pages/LoginPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AdminPage from "@/pages/AdminPage";
import UserPage from "@/pages/UserPage";
import AllSessionsPage from "@/components/AllSessionsPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          {/* Protected routes wrapped with Navbar and ThemeProvider */}
          <Route
            path="/admin"
            element={
              <ThemeProvider>
                <Navbar />
                <AdminPage />
              </ThemeProvider>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ThemeProvider>
                <Navbar />
                <UserPage />
              </ThemeProvider>
            }
          />
          <Route
            path="/sessions"
            element={
              <ThemeProvider>
                <Navbar />
                <AllSessionsPage />
              </ThemeProvider>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}