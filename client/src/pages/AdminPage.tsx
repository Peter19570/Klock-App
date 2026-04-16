import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  // Both ADMIN and SUPER_ADMIN are routed here; role-gating happens inside AdminDashboard
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AdminDashboard />;
}
