import { useAuth } from "@/contexts/AuthContext";
import { usePageControls } from "@/contexts/PageControlsContext";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const { leftContent, rightContent } = usePageControls();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onMenuClick} title="Menú">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">{leftContent}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1 md:gap-4">
        {rightContent}
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <User className="h-4 w-4" />
          <span>{user?.username}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">
            {user?.role === "admin" ? "Admin" : "Operador"}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
