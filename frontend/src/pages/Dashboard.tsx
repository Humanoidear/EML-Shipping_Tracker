import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ScanLine, Search, X, CheckCircle, AlertTriangle, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { KanbanBoard, type KanbanFilters } from "@/components/kanban/KanbanBoard";
import { QRScanner } from "@/components/qr/QRScanner";
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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesList, setClientesList] = useState<Cliente[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<KanbanFilters>({
    matricula: "",
    clienteId: "todos",
    tipoIso: "todos",
    soloPeligrosa: false,
  });

  useEffect(() => {
    api
      .get("/clientes")
      .then((res) => setClientesList(res.data))
      .catch(console.error);
  }, []);

  const activeFilterCount =
    (filters.matricula ? 1 : 0) +
    (filters.clienteId !== "todos" ? 1 : 0) +
    (filters.tipoIso !== "todos" ? 1 : 0) +
    (filters.soloPeligrosa ? 1 : 0);

  const clearFilters = () => {
    setFilters({
      matricula: "",
      clienteId: "todos",
      tipoIso: "todos",
      soloPeligrosa: false,
    });
  };

  const openCreateDialog = async () => {
    try {
      const [estRes, cliRes] = await Promise.all([api.get("/estados"), api.get("/clientes")]);
      setEstados(estRes.data);
      setClientes(cliRes.data);
      setShowCreateDialog(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQRScanned = (matricula: string) => {
    setShowScanner(false);
    api
      .get(`/contenedores/qr/${matricula}`)
      .then((res) => {
        if (res.data?.id) {
          navigate(`/contenedores/${res.data.id}`);
        } else {
          console.error("QR: no id in response", res.data);
        }
      })
      .catch((err) => {
        console.error("QR scan error:", err);
        alert("Contenedor no encontrado");
      });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de Contenedores</h1>
        <div className="flex gap-2">
          {user?.permisos?.can_scan_qr && (
            <Button variant="outline" size="sm" onClick={() => setShowScanner(true)}>
              <ScanLine className="mr-2 h-4 w-4" />
              Escanear QR
            </Button>
          )}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Contenedor
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
      </div>

      <div className="mb-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((o) => !o)}
            className="gap-1.5"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="gap-1.5"
          >
            <X className="h-4 w-4" />
            Limpiar filtros
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
        <div
          className={`
            overflow-hidden transition-all duration-200 ease-in-out
            ${filtersOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          <div className="flex flex-wrap items-end gap-3 border-t px-3 pb-3 pt-3">
            <div className="flex-1" style={{ minWidth: 200 }}>
              <Label className="mb-1.5 block text-xs">Matrícula</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar matrícula..."
                  value={filters.matricula}
                  onChange={(e) => setFilters((f) => ({ ...f, matricula: e.target.value }))}
                  className="pl-8"
                />
              </div>
            </div>
            <div style={{ minWidth: 160 }}>
              <Label className="mb-1.5 block text-xs">Cliente</Label>
              <Select
                value={filters.clienteId}
                onValueChange={(v) => setFilters((f) => ({ ...f, clienteId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientesList.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div style={{ minWidth: 140 }}>
              <Label className="mb-1.5 block text-xs">Tipo ISO</Label>
              <Select
                value={filters.tipoIso}
                onValueChange={(v) => setFilters((f) => ({ ...f, tipoIso: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {TIPO_ISO_OPTIONS.map((iso) => (
                    <SelectItem key={iso} value={iso}>
                      {iso}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Label className="cursor-pointer text-xs">Solo mercancía peligrosa</Label>
              <Switch
                checked={filters.soloPeligrosa}
                onCheckedChange={(v) => setFilters((f) => ({ ...f, soloPeligrosa: v }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard key={refreshKey} filters={filters} />
      </div>
      {showScanner && (
        <QRScanner
          onScan={handleQRScanned}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

function CreateContenedorDialog({
  estados,
  clientes,
  onCreated,
}: {
  estados: Estado[];
  clientes: Cliente[];
  onCreated: () => void;
}) {
  const [matricula, setMatricula] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [tipoIso, setTipoIso] = useState("");
  const [origen, setOrigen] = useState("");
  const [estadoId, setEstadoId] = useState<string>("");
  const [peligrosa, setPeligrosa] = useState(false);
  const [peso, setPeso] = useState("");
  const [mercancia, setMercancia] = useState("");
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);

  const matriculaValida = matricula.length > 0 ? isValidMatricula(matricula) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contenedores", {
        matricula,
        cliente_id: clienteId ? parseInt(clienteId) : null,
        tipo_iso: tipoIso,
        origen,
        estado_id: estadoId ? parseInt(estadoId) : null,
        mercancia_peligrosa: peligrosa,
        peso_kg: peso ? parseFloat(peso) : null,
        mercancia,
        notas,
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
            <Input
              id="matricula"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="ABCD1234567"
              required
              className="pr-9"
            />
            {matriculaValida === true && (
              <CheckCircle className="absolute right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
            )}
            {matriculaValida === false && (
              <AlertTriangle className="absolute right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500" />
            )}
          </div>
          {matriculaValida === false && (
            <p className="text-xs text-amber-600">
              El formato no coincide con ISO 6346 (4 letras + 7 dígitos)
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.nombre}
                  </SelectItem>
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
          <div className="space-y-2">
            <Label>Origen</Label>
            <Input value={origen} onChange={(e) => setOrigen(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado inicial</Label>
            <Select value={estadoId} onValueChange={setEstadoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Peso (KG)</Label>
          <Input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Mercancía</Label>
          <Input value={mercancia} onChange={(e) => setMercancia(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notas</Label>
          <Input value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <Label htmlFor="peligrosa" className="cursor-pointer">
            Mercancía peligrosa
          </Label>
          <Switch id="peligrosa" checked={peligrosa} onCheckedChange={setPeligrosa} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear Contenedor"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
