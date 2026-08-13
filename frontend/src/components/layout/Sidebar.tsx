import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, BarChart3, Globe, Settings, MonitorPlay,
  Shield, PanelLeftClose, PanelLeftOpen, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet";
import logoSvg from "/img/logo.svg";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Contenedores" },
  { to: "/live", icon: MonitorPlay, label: "Vista en vivo" },
  { to: "/admin", icon: Shield, label: "Admin", adminOnly: true },
  { to: "/admin/reports", icon: BarChart3, label: "Reportes", perm: "can_view_reports" },
  { to: "/admin/globe", icon: Globe, label: "Globo 3D", perm: "can_view_globe" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onOpenChange }: SidebarProps) {
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

  const navLinkClasses = (isActive: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
      collapsed ? "justify-center px-1" : "px-3",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn("hidden flex-col border-r border-border bg-card transition-all duration-200 md:flex", collapsed ? "w-14" : "w-56")}>
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
                className={({ isActive }) => navLinkClasses(isActive)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
        <div className={cn("flex items-center border-t border-border p-2", collapsed ? "flex-col justify-center gap-1" : "gap-1")}>
          <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} title={dark ? "Modo claro" : "Modo oscuro"}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleCollapsed} title={collapsed ? "Expandir" : "Colapsar"}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <img src={logoSvg} alt="EML" className="h-8 w-8 shrink-0 invert-on-dark" />
            <span className="font-bold text-sm">EML Tracker</span>
            <SheetCloseButton className="ml-auto p-1" />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {navItems.map((item) => {
              if (!canShow(item)) return null;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={true}
                  onClick={() => onOpenChange(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-1 border-t border-border p-2">
            <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} title={dark ? "Modo claro" : "Modo oscuro"}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
