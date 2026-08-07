import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, UserCog, User, Shield } from "lucide-react";

interface Estado {
  id: number;
  nombre: string;
  color: string;
  orden: number;
  is_default: boolean;
}

interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Usuarios</TabsTrigger>}
          {isAdmin && <TabsTrigger value="estados">Estados</TabsTrigger>}
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="estados">
            <EstadosSettings />
          </TabsContent>
        )}

        <TabsContent value="clientes">
          <ClientesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return alert("Las contraseñas no coinciden");
    if (password.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");
    await api.put(`/users/${user!.id}`, { password });
    setSaved(true);
    setPassword("");
    setConfirm("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
        <CardDescription>Gestiona tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Usuario:</span>
            <span className="font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Email:</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Rol:</span>
            <span className="font-medium">{user?.role === "admin" ? "Administrador" : "Operador"}</span>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="max-w-sm space-y-4">
          <h3 className="text-sm font-semibold">Cambiar Contraseña</h3>
          <div className="space-y-2">
            <Label>Nueva contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Confirmar contraseña</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit">
            <UserCog className="mr-2 h-4 w-4" />
            Cambiar Contraseña
          </Button>
          {saved && <p className="text-sm text-green-400">Contraseña actualizada</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function EstadosSettings() {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingEstado, setEditingEstado] = useState<Estado | null>(null);

  useEffect(() => {
    api.get("/estados").then((res) => setEstados(res.data));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este estado?")) return;
    try {
      await api.delete(`/estados/${id}`);
      setEstados((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Estados de Contenedores</CardTitle>
          <CardDescription>Gestiona los estados del kanban</CardDescription>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Estado
            </Button>
          </DialogTrigger>
          <EstadoFormDialog
            onSaved={(estado) => {
              setEstados((prev) => [...prev, estado]);
              setShowCreate(false);
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {estados.map((estado) => (
            <div key={estado.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded" style={{ backgroundColor: estado.color }} />
                <span className="font-medium">{estado.nombre}</span>
                {estado.is_default && (
                  <span className="text-xs text-muted-foreground">(por defecto)</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => setEditingEstado(estado)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                {!estado.is_default && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(estado.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editingEstado} onOpenChange={() => setEditingEstado(null)}>
        <DialogContent className="sm:max-w-sm">
          {editingEstado && (
            <EstadoFormDialog
              estado={editingEstado}
              onSaved={(updated) => {
                setEstados((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                setEditingEstado(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EstadoFormDialog({
  estado,
  onSaved,
}: {
  estado?: Estado;
  onSaved: (e: Estado) => void;
}) {
  const [nombre, setNombre] = useState(estado?.nombre || "");
  const [color, setColor] = useState(estado?.color || "#3b82f6");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (estado) {
        const res = await api.put(`/estados/${estado.id}`, { nombre, color });
        onSaved(res.data);
      } else {
        const res = await api.post("/estados", { nombre, color });
        onSaved(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{estado ? "Editar Estado" : "Nuevo Estado"}</DialogTitle>
        <DialogDescription>
          {estado ? "Modifica los datos del estado." : "Crea un nuevo estado para el kanban."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre *</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: En Depósito" required />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 px-1"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">{estado ? "Guardar" : "Crear Estado"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ClientesSettings() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get("/clientes").then((res) => setClientes(res.data));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    await api.delete(`/clientes/${id}`);
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>Gestiona los clientes del sistema</CardDescription>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <ClienteFormDialog
            onSaved={(cliente) => {
              setClientes((prev) => [...prev, cliente]);
              setShowCreate(false);
            }}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {clientes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin clientes registrados</p>
          )}
          {clientes.map((cliente) => (
            <div key={cliente.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{cliente.nombre}</p>
                {cliente.email && <p className="text-xs text-muted-foreground">{cliente.email}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(cliente.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClienteFormDialog({
  cliente,
  onSaved,
}: {
  cliente?: Cliente;
  onSaved: (c: Cliente) => void;
}) {
  const [nombre, setNombre] = useState(cliente?.nombre || "");
  const [email, setEmail] = useState(cliente?.email || "");
  const [telefono, setTelefono] = useState(cliente?.telefono || "");
  const [direccion, setDireccion] = useState(cliente?.direccion || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (cliente) {
        const res = await api.put(`/clientes/${cliente.id}`, { nombre, email, telefono, direccion });
        onSaved(res.data);
      } else {
        const res = await api.post("/clientes", { nombre, email, telefono, direccion });
        onSaved(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{cliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nombre *</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Dirección</Label>
          <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit">{cliente ? "Guardar" : "Crear Cliente"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [showPermisos, setShowPermisos] = useState<UserData | null>(null);

  useEffect(() => { api.get("/users").then((res) => setUsers(res.data)); }, []);

  const handleDelete = async (userId: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    await api.delete(`/users/${userId}`);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestión de Usuarios</CardTitle>
          <CardDescription>Administra los usuarios del sistema</CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Usuario
        </Button>
      </CardHeader>
      <CardContent>
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
                    <Shield className="mr-1 h-3 w-3" /> Permisos
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
      </CardContent>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <UserFormFields onSaved={(u) => { setUsers((prev) => [...prev, u]); setShowCreate(false); }} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          {editingUser && (
            <UserFormFields user={editingUser} onSaved={(updated) => {
              setUsers((prev) => prev.map((us) => (us.id === updated.id ? updated : us)));
              setEditingUser(null);
            }} />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!showPermisos} onOpenChange={() => setShowPermisos(null)}>
        <DialogContent className="sm:max-w-md">
          {showPermisos && (
            <UserPermisosForm user={showPermisos} onSaved={(updated) => {
              setUsers((prev) => prev.map((us) => (us.id === updated.id ? updated : us)));
              setShowPermisos(null);
            }} onClose={() => setShowPermisos(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface UserData {
  id: number; username: string; email: string; role: string;
  permisos: { can_manage_users: boolean; can_manage_clientes: boolean; can_manage_estados: boolean; can_view_reports: boolean; can_view_globe: boolean; can_export_data: boolean; can_scan_qr: boolean; } | null;
}

function UserFormFields({ user, onSaved }: { user?: UserData; onSaved: (u: UserData) => void }) {
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
        const res = await api.put(`/users/${user.id}`, { username, email, role, ...(password ? { password } : {}) });
        onSaved(res.data);
      } else {
        const res = await api.post("/auth/register", { username, email, password, role });
        onSaved(res.data);
      }
    } catch (err: any) { alert(err.response?.data?.error || "Error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        <DialogDescription>{user ? "Modifica los datos del usuario." : "Crea un nuevo usuario en el sistema."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2"><Label>Usuario *</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-2"><Label>Contraseña {!user && "*"}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={user ? "Dejar vacío para no cambiar" : ""} required={!user} /></div>
        <div className="space-y-2"><Label>Rol</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="operator">Operador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Guardando..." : user ? "Guardar Cambios" : "Crear Usuario"}</Button></DialogFooter>
      </form>
    </>
  );
}

function UserPermisosForm({ user, onSaved, onClose }: { user: UserData; onSaved: (u: UserData) => void; onClose: () => void }) {
  const [permisos, setPermisos] = useState(user.permisos || { can_manage_users: false, can_manage_clientes: true, can_manage_estados: false, can_view_reports: false, can_view_globe: false, can_export_data: false, can_scan_qr: true });
  const toggle = (key: string) => setPermisos((prev) => ({ ...prev, [key]: !(prev as any)[key] }));
  const handleSave = async () => { const res = await api.put(`/users/${user.id}/permisos`, permisos); onSaved(res.data); };

  const permLabels: Record<string, string> = { can_manage_users: "Gestionar usuarios", can_manage_clientes: "Gestionar clientes", can_manage_estados: "Gestionar estados", can_view_reports: "Ver reportes", can_view_globe: "Ver globo 3D", can_export_data: "Exportar datos", can_scan_qr: "Escanear QR" };

  return (
    <>
      <DialogHeader><DialogTitle>Permisos de {user.username}</DialogTitle><DialogDescription>Controla lo que este usuario puede hacer.</DialogDescription></DialogHeader>
      <div className="space-y-3">
        {Object.entries(permLabels).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-md border p-3">
            <Label className="cursor-pointer">{label}</Label>
            <Switch checked={(permisos as any)[key]} onCheckedChange={() => toggle(key)} disabled={user.role === "admin" && key === "can_manage_users"} />
          </div>
        ))}
      </div>
      <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>Guardar Permisos</Button></DialogFooter>
    </>
  );
}