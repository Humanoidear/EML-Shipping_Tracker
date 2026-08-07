import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, User } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
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

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPermisos, setShowPermisos] = useState<UserData | null>(null);

  useEffect(() => {
    api.get("/users").then((res) => setUsers(res.data));
  }, []);

  const handleDelete = async (userId: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    await api.delete(`/users/${userId}`);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                      {u.role === "admin" ? "Admin" : "Operador"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPermisos(u)}>
                  <Shield className="mr-1 h-3 w-3" />
                  Permisos
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                {u.id !== currentUser?.id && (
                  <Button variant="outline" size="sm" onClick={() => handleDelete(u.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <UserFormFields
            onSaved={(u) => { setUsers((prev) => [...prev, u]); setShowCreate(false); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          {editingUser && (
            <UserFormFields
              user={editingUser}
              onSaved={(updated) => {
                setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                setEditingUser(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!showPermisos} onOpenChange={() => setShowPermisos(null)}>
        <DialogContent className="sm:max-w-md">
          {showPermisos && (
            <PermisosForm
              user={showPermisos}
              onSaved={(updated) => {
                setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                setShowPermisos(null);
              }}
              onClose={() => setShowPermisos(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserFormFields({
  user,
  onSaved,
}: {
  user?: UserData;
  onSaved: (u: UserData) => void;
}) {
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "operator");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        const res = await api.put(`/users/${user.id}`, {
          username, email, role,
          ...(password ? { password } : {}),
        });
        onSaved(res.data);
      } else {
        const res = await api.post("/auth/register", {
          username, email, password, role,
        });
        onSaved(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        <DialogDescription>
          {user ? "Modifica los datos del usuario." : "Crea un nuevo usuario en el sistema."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Usuario *</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email *</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Contraseña {!user && "*"}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={user ? "Dejar vacío para no cambiar" : ""}
            required={!user}
          />
        </div>
        <div className="space-y-2">
          <Label>Rol</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operator">Operador</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : user ? "Guardar Cambios" : "Crear Usuario"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function PermisosForm({
  user,
  onSaved,
  onClose,
}: {
  user: UserData;
  onSaved: (u: UserData) => void;
  onClose: () => void;
}) {
  const [permisos, setPermisos] = useState(
    user.permisos || {
      can_manage_users: false,
      can_manage_clientes: true,
      can_manage_estados: false,
      can_view_reports: false,
      can_view_globe: false,
      can_export_data: false,
      can_scan_qr: true,
    }
  );

  const toggle = (key: string) => {
    setPermisos((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  };

  const handleSave = async () => {
    const res = await api.put(`/users/${user.id}/permisos`, permisos);
    onSaved(res.data);
  };

  const permLabels: Record<string, string> = {
    can_manage_users: "Gestionar usuarios",
    can_manage_clientes: "Gestionar clientes",
    can_manage_estados: "Gestionar estados",
    can_view_reports: "Ver reportes",
    can_view_globe: "Ver globo 3D",
    can_export_data: "Exportar datos",
    can_scan_qr: "Escanear QR",
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Permisos de {user.username}</DialogTitle>
        <DialogDescription>Controla lo que este usuario puede hacer.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {Object.entries(permLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-md border p-3">
            <Label className="cursor-pointer">{label}</Label>
            <Switch
              checked={(permisos as any)[key]}
              onCheckedChange={() => toggle(key)}
              disabled={user.role === "admin" && key === "can_manage_users"}
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>Guardar Permisos</Button>
      </DialogFooter>
    </>
  );
}
