import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePageControls } from "@/contexts/PageControlsContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus, ScanLine, Search, X, CheckCircle, AlertTriangle,
  Filter, Layers,
} from "lucide-react";
import { KanbanBoard, type KanbanFilters } from "@/components/kanban/KanbanBoard";
import { QRScanner } from "@/components/qr/QRScanner";
import { LocationInput } from "@/components/map/LocationInput";
import api from "@/lib/api";
import { isValidMatricula } from "@/lib/utils";

interface Estado {
  id: number;
  nombre: string;
  color: string;
  orden: number;
}

interface Cliente {
  id: number;
  nombre: string;
}

const TIPO_ISO_OPTIONS = ["20GP", "40GP", "40HC", "45HC", "20OT", "40OT", "20RE", "40RE"];

function FilterPopover({
  filters, setFilters, clientesList,
}: {
  filters: KanbanFilters;
  setFilters: React.Dispatch<React.SetStateAction<KanbanFilters>>;
  clientesList: Cliente[];
}) {
  const activeCount =
    (filters.matricula ? 1 : 0) +
    (filters.clienteId !== "todos" ? 1 : 0) +
    (filters.tipoIso !== "todos" ? 1 : 0) +
    (filters.soloPeligrosa ? 1 : 0) +
    (filters.grupoNombre ? 1 : 0);

  const clearFilters = () => {
    setFilters({ matricula: "", clienteId: "todos", tipoIso: "todos", soloPeligrosa: false, grupoNombre: "" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Filtros
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{activeCount}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtros</span>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </Button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Matrícula</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  value={filters.matricula}
                  onChange={(e) => setFilters((f) => ({ ...f, matricula: e.target.value }))}
                  placeholder="Buscar..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre de grupo</Label>
              <Input
                className="h-8 text-sm"
                value={filters.grupoNombre}
                onChange={(e) => setFilters((f) => ({ ...f, grupoNombre: e.target.value }))}
                placeholder="Buscar grupo..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente</Label>
              <Select value={filters.clienteId} onValueChange={(v) => setFilters((f) => ({ ...f, clienteId: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientesList.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo ISO</Label>
              <Select value={filters.tipoIso} onValueChange={(v) => setFilters((f) => ({ ...f, tipoIso: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPO_ISO_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Solo mercancía peligrosa</Label>
              <Switch
                checked={filters.soloPeligrosa}
                onCheckedChange={(v) => setFilters((f) => ({ ...f, soloPeligrosa: v }))}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setLeftContent, setRightContent } = usePageControls();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [filters, setFilters] = useState<KanbanFilters>({
    matricula: "",
    clienteId: "todos",
    tipoIso: "todos",
    soloPeligrosa: false,
    grupoNombre: "",
  });

  useEffect(() => {
    api.get("/clientes").then((res) => setClientesList(res.data)).catch(console.error);
  }, []);

  const openCreateDialog = async () => {
    try {
      const [estRes, cliRes] = await Promise.all([api.get("/estados"), api.get("/clientes")]);
      setEstados(estRes.data);
      setClientes(cliRes.data);
      setShowCreateDialog(true);
    } catch { console.error("Error opening create dialog"); }
  };

  const handleQRScanned = (matricula: string) => {
    setShowScanner(false);
    api.get(`/contenedores/qr/${matricula}`).then((res) => {
      if (res.data?.id) navigate(`/contenedores/${res.data.id}`);
    }).catch(() => alert("Contenedor no encontrado"));
  };

  const handleCreateGroup = async () => {
    if (selectedIds.size < 2) return;
    try {
      await api.post("/grupos", {
        nombre: groupName || "Grupo sin nombre",
        contenedor_ids: Array.from(selectedIds),
        estado_id: null,
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowGroupDialog(false);
      setGroupName("");
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      alert(e.response?.data?.error || "Error al crear grupo");
    }
  };

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

  const leftControls = (
    <div className="flex items-center gap-2">
      <h1 className="text-lg font-bold">Contenedores</h1>
      <FilterPopover filters={filters} setFilters={setFilters} clientesList={clientesList} />
      <Button
        variant={selectionMode ? "default" : "outline"}
        size="sm"
        onClick={() => setSelectionMode(!selectionMode)}
      >
        <Layers className="mr-1 h-3 w-3" />
        {selectionMode ? "Salir" : "Agrupar"}
      </Button>
      {selectionMode && selectedIds.size >= 2 && (
        <Button size="sm" onClick={() => setShowGroupDialog(true)}>
          Agrupar ({selectedIds.size})
        </Button>
      )}
    </div>
  );

  const rightControls = (
    <div className="flex items-center gap-2">
      {user?.permisos?.can_scan_qr && (
        <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
          <ScanLine className="mr-1 h-3 w-3" />
          Escanear QR
        </Button>
      )}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Nuevo
          </Button>
        </DialogTrigger>
        <CreateContenedorDialog
          estados={estados}
          clientes={clientes}
          onCreated={() => {
            setShowCreateDialog(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Dialog>
    </div>
  );

  useEffect(() => {
    setLeftContent(leftControls);
    setRightContent(rightControls);
    return () => { setLeftContent(null); setRightContent(null); };
  }, [filters, selectionMode, selectedIds.size, showCreateDialog, showScanner, clientesList, estados, clientes, user]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden py-4">
        <KanbanBoard
          key={refreshKey}
          filters={filters}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={(id) => setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })}
        />
      </div>
      {showScanner && (
        <QRScanner onScan={handleQRScanned} onClose={() => setShowScanner(false)} />
      )}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear Grupo</DialogTitle>
            <DialogDescription>{selectedIds.size} contenedores seleccionados</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Nombre del grupo" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowGroupDialog(false); setGroupName(""); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup}>Agrupar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateContenedorDialog({
  estados, clientes, onCreated,
}: {
  estados: Estado[];
  clientes: Cliente[];
  onCreated: () => void;
}) {
  const [matricula, setMatricula] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [tipoIso, setTipoIso] = useState("");
  const [origen, setOrigen] = useState("");
  const [origenLat, setOrigenLat] = useState<number | undefined>();
  const [origenLng, setOrigenLng] = useState<number | undefined>();
  const [estadoId, setEstadoId] = useState<string>("");
  const [peligrosa, setPeligrosa] = useState(false);
  const [peso, setPeso] = useState("");
  const [mercancia, setMercancia] = useState("");
  const [destino, setDestino] = useState("");
  const [destinoLat, setDestinoLat] = useState<number | undefined>();
  const [destinoLng, setDestinoLng] = useState<number | undefined>();
  const [notas, setNotas] = useState("");
  const [alquilado, setAlquilado] = useState(false);
  const [fechaInicioAlquiler, setFechaInicioAlquiler] = useState("");
  const [fechaDevolucionAlquiler, setFechaDevolucionAlquiler] = useState("");
  const [loading, setLoading] = useState(false);

  const matriculaValid = isValidMatricula(matricula);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estadoId) {
      alert("Debes seleccionar un estado inicial");
      return;
    }
    setLoading(true);
    try {
      await api.post("/contenedores", {
        matricula,
        cliente_id: clienteId ? parseInt(clienteId) : null,
        tipo_iso: tipoIso,
        origen,
        origen_lat: origenLat ?? null,
        origen_lng: origenLng ?? null,
        destino,
        destino_lat: destinoLat ?? null,
        destino_lng: destinoLng ?? null,
        estado_id: estadoId ? parseInt(estadoId) : null,
        mercancia_peligrosa: peligrosa,
        peso_kg: peso ? parseFloat(peso) : null,
        mercancia,
        notas,
        alquilado,
        fecha_inicio_alquiler: alquilado && fechaInicioAlquiler ? new Date(fechaInicioAlquiler).toISOString() : null,
        fecha_devolucion_alquiler: alquilado && fechaDevolucionAlquiler ? new Date(fechaDevolucionAlquiler).toISOString() : null,
      });
      onCreated();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al crear contenedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Nuevo Contenedor</DialogTitle>
        <DialogDescription>Registra un nuevo contenedor en el sistema.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="matricula">Matrícula *</Label>
          <div className="relative">
            <Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="ABCD1234567" required />
            {matricula && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {matriculaValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
              </span>
            )}
          </div>
          {matricula && !matriculaValid && (
            <p className="text-xs text-orange-500">Formato ISO 6346 no detectado</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo ISO</Label>
            <Input value={tipoIso} onChange={(e) => setTipoIso(e.target.value)} placeholder="20GP, 40HC..." />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Origen</Label><LocationInput value={origen} onChange={(v, lat, lng) => {
            setOrigen(v);
            if (lat != null && lng != null) {
              setOrigenLat(lat);
              setOrigenLng(lng);
            }
          }} placeholder="Buscar origen..." /></div>
          <div className="space-y-2"><Label>Destino</Label><LocationInput
            value={destino}
            onChange={(v, lat, lng) => {
              setDestino(v);
              if (lat != null && lng != null) {
                setDestinoLat(lat);
                setDestinoLng(lng);
              }
            }}
            placeholder="Colón - Mariel"
          /></div>
        </div>
        <div className="space-y-2">
          <Label>Estado inicial *</Label>
          <Select value={estadoId} onValueChange={setEstadoId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {estados.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!estadoId && <p className="text-xs text-orange-500">El estado es obligatorio</p>}
        </div>
        <div className="space-y-2"><Label>Tara (KG)</Label><Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} /></div>
        <div className="space-y-2"><Label>Mercancía</Label><Input value={mercancia} onChange={(e) => setMercancia(e.target.value)} /></div>
        <div className="space-y-2"><Label>Notas</Label><Input value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="peligrosa" className="cursor-pointer">Mercancía peligrosa</Label>
          <Switch id="peligrosa" checked={peligrosa} onCheckedChange={setPeligrosa} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="alquilado" className="cursor-pointer">Alquilado</Label>
          <Switch id="alquilado" checked={alquilado} onCheckedChange={setAlquilado} />
        </div>
        {alquilado && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Inicio alquiler</Label>
              <Input type="datetime-local" value={fechaInicioAlquiler} onChange={(e) => setFechaInicioAlquiler(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Devolución alquiler</Label>
              <Input type="datetime-local" value={fechaDevolucionAlquiler} onChange={(e) => setFechaDevolucionAlquiler(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear Contenedor"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
