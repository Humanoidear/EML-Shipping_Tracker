import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, BarChart3, Globe, Settings,
  Shield, PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoSvg from "/img/logo.svg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Contenedores" },
  { to: "/admin", icon: Shield, label: "Admin", adminOnly: true },
  { to: "/admin/reports", icon: BarChart3, label: "Reportes", perm: "can_view_reports" },
  { to: "/admin/globe", icon: Globe, label: "Globo 3D", perm: "can_view_globe" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

export function Sidebar() {
  const { user, updatePreference } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    if (user?.sidebar_collapsed != null) return user.sidebar_collapsed;
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [dark, setDark] = useState(() => {
    if (user?.theme) return user.theme === "dark";
    return localStorage.getItem("theme") === "dark";
  });
  const syncingTheme = useRef(false);

  useEffect(() => {
    if (user?.theme) {
      syncingTheme.current = true;
      setDark(user.theme === "dark");
    }
  }, [user?.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
    if (user && !syncingTheme.current) {
      updatePreference({ theme: dark ? "dark" : "light" }).catch(() => {});
    }
    syncingTheme.current = false;
  }, [dark]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    if (user) {
      updatePreference({ sidebar_collapsed: next }).catch(() => {});
    }
  };

  const canShow = (item: (typeof navItems)[number]) => {
    if (item.adminOnly && user?.role !== "admin") return false;
    if (item.perm && user?.role !== "admin" && !(user?.permisos as any)?.[item.perm]) return false;
    return true;
  };

  return (
    <aside className={cn("flex flex-col border-r border-border bg-card transition-all duration-200", collapsed ? "w-14" : "w-56")}>
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "gap-2 px-4")}>
        <img src={logoSvg} alt="EML" className={cn("shrink-0 invert-on-dark", collapsed ? "h-6 w-6" : "h-8 w-8")} />
        {!collapsed && <span className="font-bold text-sm">EML Tracker</span>}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          if (!canShow(item)) return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={true}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-1" : "px-3",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className={cn("border-t border-border p-2 flex items-center", collapsed ? "flex-col gap-1 justify-center" : "gap-1")}>
        <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} title={dark ? "Modo claro" : "Modo oscuro"}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleCollapsed} title={collapsed ? "Expandir" : "Colapsar"}>
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
