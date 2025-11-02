import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../vs-api";
import { getUserSession } from "../utils/auth";
import venueLogo from "../venue.svg";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerUser({ username, password, role });
      alert("Registered successfully! Please login.");
      navigate("/login");
    } catch (err) {
      alert("Registration failed.");
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    const { token, role } = getUserSession();
    if (token && role) {
      // Redirect to appropriate dashboard based on role
      // Handle both "ADMIN" and "Admin" cases
      if (role === "ADMIN" || role === "Admin") {
        navigate("/dashboard-admin", { replace: true });
      } else {
        navigate("/dashboard-user", { replace: true });
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-black">
      {/* Register Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={venueLogo} alt="Venue Logo" className="h-20 w-auto" />
            </div>
            <p className="text-white/60 text-sm">Create your account to get started</p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-white/90 text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-white/90 text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-white/90 text-sm font-medium mb-2">
                Account Type
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white focus:outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="USER" className="bg-black text-white">User</option>
                <option value="ADMIN" className="bg-black text-white">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 text-white font-medium gradient-outline-button rounded-lg focus:outline-none transition-all duration-200 transform hover:scale-[1.02]"
            >
              Register
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 underline-offset-2 hover:underline"
              >
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
