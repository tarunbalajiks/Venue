import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../vs-api";
import { getUserSession } from "../utils/auth";
import venueLogo from "../venue.svg";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const { token, role } = getUserSession();
    if (token && role) {
      // Redirect to appropriate dashboard based on role
      if (role === "ADMIN") {
        navigate("/dashboard-admin", { replace: true });
      } else {
        navigate("/dashboard-user", { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Hardcoded admin credentials - bypass database check
    if (username.toLowerCase() === "admin" && password === "admin") {
      // Directly set admin session without API call
      localStorage.setItem("token", "admin-token-" + Date.now());
      localStorage.setItem("role", "ADMIN");
      navigate("/dashboard-admin");
      return;
    }
    
    // Normal login flow for other users
    try {
      const res = await loginUser({ username, password });
      const { token, role } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);

      if (role === "ADMIN") navigate("/dashboard-admin");
      else navigate("/dashboard-user");
    } catch (err) {
      alert("Invalid login!");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-black">
      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel rounded-2xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={venueLogo} alt="Venue Logo" className="h-20 w-auto" />
            </div>
            <p className="text-white/60 text-sm">Welcome back, please login</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-white/90 text-sm font-medium mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
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
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 text-white font-medium gradient-outline-button rounded-lg focus:outline-none transition-all duration-200 transform hover:scale-[1.02]"
            >
              Login
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              Don't have an account?{" "}
              <a
                href="/register"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors duration-200 underline-offset-2 hover:underline"
              >
                Register
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
