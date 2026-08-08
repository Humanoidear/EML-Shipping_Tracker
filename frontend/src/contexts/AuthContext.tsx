import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api from "@/lib/api";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "operator";
  theme?: string;
  sidebar_collapsed?: boolean;
  permisos: {
    can_manage_users: boolean;
    can_manage_clientes: boolean;
    can_manage_estados: boolean;
    can_view_reports: boolean;
    can_view_globe: boolean;
    can_export_data: boolean;
    can_scan_qr: boolean;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePreference: (prefs: Partial<{ theme: string; sidebar_collapsed: boolean }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      localStorage.removeItem("token");
      setToken(null);
    }
  };

  const updatePreference = async (prefs: Partial<{ theme: string; sidebar_collapsed: boolean }>) => {
    if (!user) return;
    const res = await api.put(`/users/${user.id}`, prefs);
    setUser(res.data);
  };

  useEffect(() => {
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Refresh permissions periodically so changes by an admin take effect without re-login.
  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      refreshUser();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [token]);

  const login = async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, updatePreference }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
