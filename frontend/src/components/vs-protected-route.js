import { Navigate } from "react-router-dom";
import { getUserSession } from "../utils/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = getUserSession();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}