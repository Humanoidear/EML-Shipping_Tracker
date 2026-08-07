import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Settings2, UserCog } from "lucide-react";

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
  const isAdmin = user?.role === "admin" || user?.permisos?.can_manage_estados;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Configuración</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="estados">Estados</TabsTrigger>}
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

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
