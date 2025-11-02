import logo from './logo.svg';
import './App.css';
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/vs-loginpage";
import RegisterPage from "./pages/vs-registerpage";
import DashboardUser from "./pages/vs-dashboard-user";
import DashboardAdmin from "./pages/vs-dashboard-organiser";
import PrivateRoute from "./components/vs-privateroute";
import ProtectedRoute from "./components/vs-protected-route";
import GuestRoute from "./components/vs-guest-route";


function App() {
  return (
	<Router>
	<Routes>
		<Route 
			path="/login" 
			element={
				<GuestRoute>
					<LoginPage />
				</GuestRoute>
			} 
		/>
		<Route 
			path="/register" 
			element={
				<GuestRoute>
					<RegisterPage />
				</GuestRoute>
			} 
		/>

		{/* Private Routes */}
		<Route
			path="/dashboard-user"
			element={
			<PrivateRoute roles={["USER"]}>
				<DashboardUser />
			</PrivateRoute>
			}
		/>
		<Route
			path="/dashboard-admin"
			element={
			<PrivateRoute roles={["ADMIN"]}>
				<DashboardAdmin />
			</PrivateRoute>
			}
		/>

		{/* Default */}
		<Route path="*" element={<Navigate to="/login" />} />
	</Routes>
	</Router>
  );
}

export default App;
