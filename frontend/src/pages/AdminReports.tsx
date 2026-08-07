import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { usePageControls } from "@/contexts/PageControlsContext";
import { cn } from "@/lib/utils";
import { ReportCharts } from "@/components/charts/ReportCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, PieChart, LineChart, Plus, Pencil, Trash2, Eye,
  GripVertical,
} from "lucide-react";
import {
  DndContext, useSensors, PointerSensor, useSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LineChart as ReLineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
} from "recharts";

interface VistaConfig {
  chartType: string;
  groupBy: string;
}

interface Vista {
  id: number;
  nombre: string;
  config: VistaConfig;
}

interface PreviewPoint {
  name: string;
  value: number;
  color?: string;
}

interface VistaChart extends Vista {
  data: PreviewPoint[];
  loading: boolean;
}

const CHART_TYPE_OPTIONS = [
  { value: "bar", label: "Barra" },
  { value: "pie", label: "Torta" },
  { value: "line", label: "Línea" },
] as const;

const GROUP_BY_OPTIONS = [
  { value: "estado", label: "Estado" },
  { value: "tipo_iso", label: "Tipo ISO" },
  { value: "peligrosa", label: "Mercancía Peligrosa" },
  { value: "cliente", label: "Cliente" },
  { value: "movimientos_time", label: "Movimientos en el Tiempo" },
] as const;

function chartTypeIcon(type: string) {
  switch (type) {
    case "bar": return <BarChart3 className="h-6 w-6" />;
    case "pie": return <PieChart className="h-6 w-6" />;
    case "line": return <LineChart className="h-6 w-6" />;
    default: return <BarChart3 className="h-6 w-6" />;
  }
}

function chartTypeLabel(type: string) {
  return CHART_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function groupByLabel(value: string) {
  return GROUP_BY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function ChartWidget({ vista }: { vista: VistaChart }) {
  if (vista.loading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Cargando...</p>
      </div>
    );
  }
  if (!vista.data || vista.data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs text-muted-foreground">Sin datos</p>
      </div>
    );
  }

  if (vista.config.chartType === "line") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
        <ResponsiveContainer width="100%" height={250}>
          <ReLineChart data={vista.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <ReTooltip
              contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--popover-foreground))" }}
            />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <ReportCharts
      type={vista.config.chartType as "bar" | "pie"}
      title={vista.nombre}
      data={vista.data.map((d) => ({ name: d.name, value: d.value, color: d.color }))}
      height={250}
    />
  );
}

const DASHBOARD_ID = "mis-vistas";

export default function AdminReports() {
  const { setLeftContent } = usePageControls();

  useEffect(() => {
    setLeftContent(<h1 className="text-lg font-bold">Reportes y Estadísticas</h1>);
    return () => setLeftContent(null);
  }, [setLeftContent]);

  const [vistas, setVistas] = useState<Vista[]>([]);
  const [vistasLoading, setVistasLoading] = useState(true);
  const [vistaTab, setVistaTab] = useState("dashboard");
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [groupBy, setGroupBy] = useState("estado");
  const [previewData, setPreviewData] = useState<PreviewPoint[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dashboardVistas, setDashboardVistas] = useState<VistaChart[]>([]);

  const fetchVistas = async () => {
    setVistasLoading(true);
    try {
      const res = await api.get("/vistas");
      setVistas(res.data);
    } catch {} finally {
      setVistasLoading(false);
    }
  };

  const fetchChartData = async (v: Vista): Promise<PreviewPoint[]> => {
    try {
      const res = await api.post("/vistas/preview", { config: v.config });
      return res.data.data ?? [];
    } catch {
      return [];
    }
  };

  useEffect(() => { fetchVistas(); }, []);

  const addToDashboard = async (vista: Vista) => {
    if (dashboardVistas.some((dv) => dv.id === vista.id)) return;
    const data = await fetchChartData(vista);
    setDashboardVistas((prev) => [...prev, { ...vista, data, loading: false }]);
  };

  const removeFromDashboard = (id: number) => {
    setDashboardVistas((prev) => prev.filter((dv) => dv.id !== id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    // Dragged from vistas list into dashboard
    if (activeId.startsWith("vista-")) {
      const vistaId = parseInt(activeId.replace("vista-", ""));
      const vista = vistas.find((v) => v.id === vistaId);
      if (vista && (overId === DASHBOARD_ID || overId.startsWith("chart-"))) {
        addToDashboard(vista);
      }
      return;
    }

    // Rearranging charts within dashboard
    if (activeId.startsWith("chart-") && overId.startsWith("chart-")) {
      const oldIndex = dashboardVistas.findIndex((dv) => `chart-${dv.id}` === activeId);
      const newIndex = dashboardVistas.findIndex((dv) => `chart-${dv.id}` === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        const items = Array.from(dashboardVistas);
        const [removed] = items.splice(oldIndex, 1);
        items.splice(newIndex, 0, removed);
        setDashboardVistas(items);
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const resetForm = () => {
    setEditId(null);
    setNombre("");
    setChartType("bar");
    setGroupBy("estado");
    setPreviewData(null);
  };

  const handleEdit = (vista: Vista) => {
    setEditId(vista.id);
    setNombre(vista.nombre);
    setChartType(vista.config.chartType);
    setGroupBy(vista.config.groupBy);
    setPreviewData(null);
    setVistaTab("nueva");
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/vistas/${id}`);
      setVistas((prev) => prev.filter((v) => v.id !== id));
      setDashboardVistas((prev) => prev.filter((dv) => dv.id !== id));
    } catch {}
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.post("/vistas/preview", { config: { chartType, groupBy } });
      setPreviewData(res.data.data ?? []);
    } catch { setPreviewData(null); }
    finally { setPreviewLoading(false); }
  };

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaveLoading(true);
    try {
      const config: VistaConfig = { chartType, groupBy };
      if (editId) {
        await api.put(`/vistas/${editId}`, { nombre: nombre.trim(), config });
      } else {
        await api.post("/vistas", { nombre: nombre.trim(), config });
      }
      resetForm();
      fetchVistas();
      setVistaTab("dashboard");
    } catch {} finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={vistaTab} onValueChange={setVistaTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Mis Vistas</TabsTrigger>
          <TabsTrigger value="nueva">{editId ? "Editar Vista" : "Nueva Vista"}</TabsTrigger>
          <TabsTrigger value="predefinidos">Reportes Predefinidos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="flex gap-6" style={{ minHeight: 500 }}>
            <div className="w-64 shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Vistas disponibles</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-1 max-h-[500px] overflow-y-auto">
                    {vistasLoading ? (
                      <p className="text-xs text-muted-foreground p-2">Cargando...</p>
                    ) : vistas.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">Sin vistas</p>
                    ) : (
                      vistas.map((vista) => {
                        const isOnDashboard = dashboardVistas.some((dv) => dv.id === vista.id);
                        return (
                          <div
                            key={vista.id}
                            className="flex items-center gap-2 rounded-md border p-2 text-xs bg-card hover:bg-accent cursor-pointer"
                            onClick={() => {
                              if (isOnDashboard) removeFromDashboard(vista.id);
                              else addToDashboard(vista);
                            }}
                          >
                            {chartTypeIcon(vista.config.chartType)}
                            <span className="flex-1 truncate font-medium">{vista.nombre}</span>
                            {isOnDashboard && (
                              <span className="text-[10px] text-primary font-medium">Añadida</span>
                            )}
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleEdit(vista); }}>
                              <Pencil className="h-2.5 w-2.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); handleDelete(vista.id); }}>
                              <Trash2 className="h-2.5 w-2.5 text-destructive" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex-1">
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 min-h-[200px]">
                <p className="text-xs text-muted-foreground mb-4">
                  Haz clic en una vista para añadirla al panel
                </p>
                {dashboardVistas.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    Sin vistas en el panel
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {dashboardVistas.map((dv) => (
                      <div key={dv.id} className="relative group">
                        <ChartWidget vista={dv} />
                        <button
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-background/80 text-destructive hover:bg-destructive/10 transition-opacity"
                          onClick={() => removeFromDashboard(dv.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="nueva">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{editId ? "Editar Vista" : "Nueva Vista"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="vista-nombre">Nombre de la Vista</Label>
                    <Input id="vista-nombre" placeholder="Ej: Contenedores por Cliente" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vista-chart">Tipo de Gráfico</Label>
                    <Select value={chartType} onValueChange={(v) => { setChartType(v); setPreviewData(null); }}>
                      <SelectTrigger id="vista-chart"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CHART_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vista-groupby">Agrupar por</Label>
                    <Select value={groupBy} onValueChange={(v) => { setGroupBy(v); setPreviewData(null); }}>
                      <SelectTrigger id="vista-groupby"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GROUP_BY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
                    <Eye className="mr-1 h-4 w-4" />
                    {previewLoading ? "Cargando..." : "Previsualizar"}
                  </Button>
                  <Button onClick={handleSave} disabled={saveLoading || !nombre.trim()}>
                    {saveLoading ? "Guardando..." : editId ? "Guardar Cambios" : "Guardar Vista"}
                  </Button>
                  <Button variant="ghost" onClick={() => { resetForm(); setVistaTab("dashboard"); }}>
                    Cancelar
                  </Button>
                </div>

                {previewData && previewData.length > 0 && (
                  <div className="mt-4">
                    {chartType === "line" ? (
                      <div className="rounded-lg border bg-card p-4">
                        <h3 className="mb-2 text-sm font-semibold">Vista previa</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <ReLineChart data={previewData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <ReTooltip
                              contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--popover-foreground))" }}
                            />
                            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <ReportCharts
                        type={chartType as "bar" | "pie"}
                        title="Vista previa"
                        data={previewData.map((d) => ({ name: d.name, value: d.value, color: d.color }))}
                        height={300}
                      />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predefinidos">
          <PredefinedReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PredefinedReports() {
  const [estadoDist, setEstadoDist] = useState<{ nombre: string; color: string; cantidad: number }[]>([]);
  const [tiposIso, setTiposIso] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [peligrosa, setPeligrosa] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [contenedores, setContenedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [alquilados, setAlquilados] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get("/reportes/estados-distribucion"),
      api.get("/reportes/tipos-iso"),
      api.get("/reportes/peligrosa"),
      api.get("/reportes/actividad"),
      api.get("/contenedores"),
      api.get("/clientes"),
    ]).then(([estRes, isoRes, pelRes, actRes, contRes, cliRes]) => {
      setEstadoDist(estRes.data);
      setTiposIso(isoRes.data);
      setPeligrosa(pelRes.data);
      setActividad(actRes.data);
      setContenedores(contRes.data);
      setClientes(cliRes.data);
    });
  }, []);

  const porCliente = useMemo(() => {
    const map = new Map<string, number>();
    contenedores.forEach((c: any) => {
      const key = c.cliente?.nombre || "Sin cliente";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [contenedores]);

  const porDestino = useMemo(() => {
    const map = new Map<string, number>();
    contenedores.forEach((c: any) => {
      if (!c.destino) return;
      map.set(c.destino, (map.get(c.destino) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contenedores]);

  const porOrigen = useMemo(() => {
    const map = new Map<string, number>();
    contenedores.forEach((c: any) => {
      const key = c.origen || "Sin origen";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contenedores]);

  const alquiladosData = useMemo(() => {
    const alq = contenedores.filter((c: any) => c.alquilado);
    const vencidos = alq.filter((c: any) => c.fecha_devolucion_alquiler && new Date(c.fecha_devolucion_alquiler) < new Date());
    return {
      alquilados: alq.length,
      vencidos: vencidos.length,
      enPlazo: alq.length - vencidos.length,
    };
  }, [contenedores]);

  const pesoPorEstado = useMemo(() => {
    return contenedores
      .filter((c: any) => c.peso_kg != null && c.estado)
      .reduce((acc: Record<string, number>, c: any) => {
        const key = c.estado.nombre;
        acc[key] = (acc[key] || 0) + Number(c.peso_kg);
        return acc;
      }, {});
  }, [contenedores]);

  const pesoData = useMemo(() =>
    Object.entries(pesoPorEstado).map(([name, value]) => ({ name, value }))
  , [pesoPorEstado]);

  const movimientosPorDia = useMemo(() => {
    const map = new Map<string, number>();
    movimientos.forEach((m: any) => {
      const day = new Date(m.created_at).toLocaleDateString("es-ES");
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).slice(-14);
  }, [movimientos]);

  const stats = useMemo(() => {
    const conUbicacion = contenedores.filter((c: any) => c.ubicacion_lat && c.ubicacion_lng).length;
    const conDestino = contenedores.filter((c: any) => c.destino).length;
    return [
      { label: "Total contenedores", value: contenedores.length },
      { label: "Total clientes", value: clientes.length },
      { label: "Con ubicación", value: conUbicacion },
      { label: "Con destino", value: conDestino },
      { label: "Alquilados", value: alquiladosData.alquilados },
      { label: "Alquileres vencidos", value: alquiladosData.vencidos },
    ];
  }, [contenedores, clientes, alquiladosData]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="estados">
        <TabsList className="flex-wrap">
          <TabsTrigger value="estados">Distribución por Estado</TabsTrigger>
          <TabsTrigger value="tipos">Tipos ISO</TabsTrigger>
          <TabsTrigger value="peligrosa">Mercancía Peligrosa</TabsTrigger>
          <TabsTrigger value="clientes">Por Cliente</TabsTrigger>
          <TabsTrigger value="destino">Por Destino</TabsTrigger>
          <TabsTrigger value="origen">Por Origen</TabsTrigger>
          <TabsTrigger value="alquilados">Alquilados</TabsTrigger>
          <TabsTrigger value="peso">Tara por Estado</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos por Día</TabsTrigger>
          <TabsTrigger value="actividad">Actividad Reciente</TabsTrigger>
        </TabsList>

        <TabsContent value="estados">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts type="bar" title="Contenedores por Estado" data={estadoDist.map((e) => ({ name: e.nombre, value: e.cantidad, color: e.color }))} />
            <ReportCharts type="pie" title="Distribución Porcentual" data={estadoDist.map((e) => ({ name: e.nombre, value: e.cantidad, color: e.color }))} />
          </div>
        </TabsContent>
        <TabsContent value="tipos">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts type="bar" title="Tipos ISO" data={tiposIso.map((t) => ({ name: t.tipo, value: t.cantidad }))} />
            <ReportCharts type="pie" title="Distribución de Tipos ISO" data={tiposIso.map((t) => ({ name: t.tipo, value: t.cantidad }))} />
          </div>
        </TabsContent>
        <TabsContent value="peligrosa">
          <ReportCharts type="pie" title="Mercancía Peligrosa vs Normal" data={peligrosa.map((p) => ({ name: p.tipo, value: p.cantidad }))} />
        </TabsContent>
        <TabsContent value="clientes">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts type="bar" title="Contenedores por Cliente" data={porCliente} />
            <ReportCharts type="pie" title="Distribución por Cliente" data={porCliente} />
          </div>
        </TabsContent>
        <TabsContent value="destino">
          <ReportCharts type="bar" title="Contenedores por Destino" data={porDestino} />
        </TabsContent>
        <TabsContent value="origen">
          <ReportCharts type="bar" title="Contenedores por Origen" data={porOrigen} />
        </TabsContent>
        <TabsContent value="alquilados">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts
              type="pie"
              title="Alquileres"
              data={[
                { name: "En plazo", value: alquiladosData.enPlazo },
                { name: "Vencidos", value: alquiladosData.vencidos },
              ]}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alquileres próximos a vencer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alquiladosData.alquilados === 0 && (
                  <p className="text-sm text-muted-foreground">Sin contenedores alquilados</p>
                )}
                {contenedores
                  .filter((c: any) => c.alquilado && c.fecha_devolucion_alquiler)
                  .map((c: any) => {
                    const venc = new Date(c.fecha_devolucion_alquiler);
                    const days = Math.ceil((venc.getTime() - Date.now()) / 86400000);
                    return (
                      <div key={c.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                        <span className="font-mono">{c.matricula}</span>
                        <span className={cn("text-xs", days < 0 ? "text-destructive font-bold" : days < 14 ? "text-orange-500" : "text-muted-foreground")}>
                          {days < 0 ? `Vencido hace ${-days} días` : `Vence en ${days} días`} — {venc.toLocaleDateString("es-ES")}
                        </span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="peso">
          <ReportCharts type="bar" title="Tara total (kg) por Estado" data={pesoData} />
        </TabsContent>
        <TabsContent value="movimientos">
          <ReportCharts type="bar" title="Movimientos por Día (últimos 14)" data={movimientosPorDia} />
        </TabsContent>
        <TabsContent value="actividad">
          <Card>
            <CardContent className="pt-6">
              {actividad.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Sin actividad registrada</p>
              ) : (
                <div className="space-y-2">
                  {actividad.slice(0, 50).map((mov: any) => (
                    <div key={mov.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                      <span className="font-mono font-medium">{mov.contenedor_id}</span>
                      {mov.estado_anterior && <span className="text-muted-foreground">{mov.estado_anterior.nombre} →</span>}
                      <span className="font-medium">{mov.estado_nuevo?.nombre}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(mov.created_at).toLocaleString()} — {mov.username}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
