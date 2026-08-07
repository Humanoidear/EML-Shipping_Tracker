import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
