import axios from "axios";

const isElectron = !!(window as any).electronAPI?.isElectron || window.location.protocol === "file:";
const API_BASE = isElectron ? "http://localhost:5050/api" : "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = isElectron ? "#/login" : "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
