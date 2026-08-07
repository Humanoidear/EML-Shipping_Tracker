import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PageControlsProvider } from "@/contexts/PageControlsContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ContenedorDetail from "@/pages/ContenedorDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminReports from "@/pages/AdminReports";
import AdminGlobe from "@/pages/AdminGlobe";
import Settings from "@/pages/Settings";
import { Spinner } from "@/components/ui/spinner";
import { Component, type ReactNode } from "react";

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Globe render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-sm font-medium text-destructive">Error al cargar el globo 3D</p>
            <p className="mt-1 text-xs text-muted-foreground">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({
  children,
  adminOnly = false,
  noPadding = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  noPadding?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className={noPadding ? "flex-1 overflow-hidden" : "flex-1 overflow-auto p-6"}>
          {noPadding ? <GlobeErrorBoundary>{children}</GlobeErrorBoundary> : children}
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute noPadding>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contenedores/:id"
        element={
          <ProtectedRoute>
            <ContenedorDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute adminOnly>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/globe"
        element={
          <ProtectedRoute adminOnly noPadding>
            <AdminGlobe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const isElectron = !!(window as any).electronAPI?.isElectron || window.location.protocol === "file:";
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <PageControlsProvider>
          <AppRoutes />
        </PageControlsProvider>
      </AuthProvider>
    </Router>
  );
}
