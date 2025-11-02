import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080/vsapi", // your backend base URL
});

export const registerUser = (data) => API.post("/auth/signup", data);
export const loginUser = (data) => API.post("/auth/login", data);
export const getProfile = (token) =>
  API.get("/user/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
