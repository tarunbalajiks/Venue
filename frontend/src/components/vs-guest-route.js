import { Navigate } from "react-router-dom";
import { getUserSession } from "../utils/auth";

/**
 * GuestRoute component that redirects authenticated users away from guest pages (login/register).
 * If user is already logged in, redirects to appropriate dashboard.
 * Otherwise, renders the guest page component.
 */
export default function GuestRoute({ children }) {
  const { token, role } = getUserSession();

  // If user is authenticated, redirect to appropriate dashboard
  if (token && role) {
    // Handle both "ADMIN" and "Admin" cases
    if (role === "ADMIN" || role === "Admin") {
      return <Navigate to="/dashboard-admin" replace />;
    } else {
      return <Navigate to="/dashboard-user" replace />;
    }
  }

  // User is not authenticated, show the guest page
  return children;
}

