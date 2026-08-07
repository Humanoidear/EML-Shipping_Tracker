import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, BarChart3, Globe, Settings, Ship,
  Shield, PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import logoSvg from "/img/logo.svg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Contenedores" },
  { to: "/admin", icon: Shield, label: "Admin", adminOnly: true },
  { to: "/admin/users", icon: Users, label: "Usuarios", adminOnly: true },
  { to: "/admin/reports", icon: BarChart3, label: "Reportes", adminOnly: true },
  { to: "/admin/globe", icon: Globe, label: "Globo 3D", adminOnly: true },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

export function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    <aside className={cn("flex flex-col border-r border-border bg-card transition-all duration-200", collapsed ? "w-14" : "w-56")}>
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "gap-2 px-4")}>
        <img src={logoSvg} alt="EML" className={cn("shrink-0 invert-on-dark", collapsed ? "h-6 w-6" : "h-8 w-8")} />
        {!collapsed && <span className="font-bold text-sm">EML Tracker</span>}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== "admin") return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
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
