import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "@/lib/api";
import { usePageControls } from "@/contexts/PageControlsContext";
import { cn } from "@/lib/utils";
import { ReportCharts } from "@/components/charts/ReportCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, PieChart, LineChart, Plus, Pencil, Trash2, Eye, Table2,
  Activity, Radar, X,
} from "lucide-react";
import {
  LineChart as ReLineChart, Line, AreaChart, Area, BarChart as ReBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer,
  Legend as ReLegend, PieChart as RePieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface GridItemLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
}

export interface VistaConfig {
  chartType: string;
  groupBy: string;
  aggregation?: string;
  limit?: number;
  sortDir?: string;
  clienteId?: string;
  estadoId?: string;
  peligrosaOnly?: boolean;
  alquiladoOnly?: boolean;
  days?: number;
  showLegend?: boolean;
  showValues?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  customColors?: string[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  onDashboard?: boolean;
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
  { value: "bar", label: "Barras" },
  { value: "hbar", label: "Barras horizontales" },
  { value: "stacked", label: "Barras apiladas" },
  { value: "pie", label: "Torta" },
  { value: "line", label: "Líneas" },
  { value: "area", label: "Área" },
  { value: "radial", label: "Radial" },
  { value: "table", label: "Tabla" },
  { value: "stat", label: "Valor único" },
] as const;

const GROUP_BY_OPTIONS = [
  { value: "estado", label: "Estado" },
  { value: "tipo_iso", label: "Tipo ISO" },
  { value: "peligrosa", label: "Mercancía Peligrosa" },
  { value: "cliente", label: "Cliente" },
  { value: "destino", label: "Destino" },
  { value: "origen", label: "Origen" },
  { value: "alquilado", label: "Alquilado / Propio" },
  { value: "peso_por_estado", label: "Peso (tara) por Estado" },
  { value: "peso_por_cliente", label: "Peso (tara) por Cliente" },
  { value: "movimientos_por_dia", label: "Movimientos por Día" },
  { value: "movimientos_por_estado", label: "Movimientos por Estado" },
] as const;

const PALETTES = [
  ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"],
  ["#0ea5e9", "#6366f1", "#a855f7", "#d946ef", "#f43f5e", "#fb7185", "#fbbf24", "#34d399"],
  ["#1e293b", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#334155", "#0f172a", "#64748b"],
];

const DEFAULT_COLORS = PALETTES[0];

function chartTypeIcon(type: string) {
  switch (type) {
    case "bar": case "hbar": case "stacked": return <BarChart3 className="h-6 w-6" />;
    case "pie": return <PieChart className="h-6 w-6" />;
    case "line": case "area": return <LineChart className="h-6 w-6" />;
    case "table": return <Table2 className="h-6 w-6" />;
    case "radial": return <Radar className="h-6 w-6" />;
    case "stat": return <Activity className="h-6 w-6" />;
    default: return <BarChart3 className="h-6 w-6" />;
  }
}

function chartTypeLabel(type: string) {
  return CHART_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function groupByLabel(value: string) {
  return GROUP_BY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--popover-foreground))",
};

function formatValue(v: number, groupBy: string) {
  if (groupBy.startsWith("peso_")) return `${Math.round(v).toLocaleString()} kg`;
  return String(v);
}

function ChartWidget({ vista, fillHeight = false }: { vista: VistaChart; fillHeight?: boolean }) {
  if (vista.loading) {
    return (
      <div className="rounded-lg border bg-card p-4 h-full">
        <p className="text-xs text-muted-foreground">Cargando...</p>
      </div>
    );
  }
  if (!vista.data || vista.data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 h-full">
        <p className="text-xs text-muted-foreground">Sin datos</p>
      </div>
    );
  }

  const data = vista.data;
  const config = vista.config;
  const colors = config.customColors?.length ? config.customColors : DEFAULT_COLORS;
  const isPeso = (config.groupBy || "").startsWith("peso_");
  const showLegend = config.showLegend ?? true;
  const showValues = config.showValues ?? false;

  const renderBar = (layout: "vertical" | "horizontal") => (
    <ReBarChart data={data} layout={layout} margin={{ top: 5, right: 10, left: isPeso ? 50 : 10, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      {layout === "vertical" ? (
        <>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        </>
      ) : (
        <>
          <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        </>
      )}
      <ReTooltip contentStyle={tooltipStyle} />
      {showLegend && <ReLegend wrapperStyle={{ fontSize: 11 }} />}
      <Bar dataKey="value" radius={[4, 4, 0, 0]} label={showValues ? { fontSize: 9, position: "top" } : undefined}>
        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
      </Bar>
    </ReBarChart>
  );

  const renderLine = (withArea: boolean) => {
    const Comp: any = withArea ? AreaChart : ReLineChart;
    const Series: any = withArea ? Area : Line;
    return (
      <Comp data={data} margin={{ top: 5, right: 10, left: isPeso ? 50 : 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
        <ReTooltip contentStyle={tooltipStyle} />
        {showLegend && <ReLegend wrapperStyle={{ fontSize: 11 }} />}
        <Series type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }}
          fill={withArea ? colors[0] : "transparent"} fillOpacity={0.2} />
      </Comp>
    );
  };

  switch (config.chartType) {
    case "hbar":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>{renderBar("horizontal")}</ResponsiveContainer>
        </div>
      );
    case "stacked":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>{renderBar("vertical")}</ResponsiveContainer>
        </div>
      );
    case "line":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>{renderLine(false)}</ResponsiveContainer>
        </div>
      );
    case "area":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>{renderLine(true)}</ResponsiveContainer>
        </div>
      );
    case "radial":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadialBarChart innerRadius="20%" outerRadius="90%" data={data} startAngle={90} endAngle={-270}>
              <RadialBar dataKey="value" background={{ fill: "hsl(var(--muted))" }}
                label={{ fontSize: 10, fill: "hsl(var(--foreground))" }}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </RadialBar>
              <ReLegend wrapperStyle={{ fontSize: 11 }} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      );
    case "table":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1.5 pr-2 font-medium">Nombre</th>
                <th className="py-1.5 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="flex items-center gap-2 py-1.5 pr-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color || colors[i % colors.length] }} />
                    {d.name}
                  </td>
                  <td className="py-1.5 font-medium">{formatValue(d.value, config.groupBy || "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "stat":
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <div className="text-3xl font-bold" style={{ color: colors[0] }}>
            {formatValue(data.reduce((s, d) => s + d.value, 0), config.groupBy || "")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{data.length} categorías</p>
        </div>
      );
    case "pie":
    default:
      return (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">{vista.nombre}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={showValues ? { fontSize: 10 } : false}>
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <ReTooltip contentStyle={tooltipStyle} />
              {showLegend && <ReLegend wrapperStyle={{ fontSize: 11 }} />}
            </RePieChart>
          </ResponsiveContainer>
        </div>
      );
  }
}

export default function AdminReports() {
  const { setLeftContent } = usePageControls();

  useEffect(() => {
    setLeftContent(<h1 className="text-lg font-bold">Reportes y Estadísticas</h1>);
    return () => setLeftContent(null);
  }, [setLeftContent]);

  const [vistas, setVistas] = useState<Vista[]>([]);
  const [vistasLoading, setVistasLoading] = useState(true);
  const [vistaTab, setVistaTab] = useState("dashboard");
  const [showBuilder, setShowBuilder] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [config, setConfig] = useState<VistaConfig>({ chartType: "bar", groupBy: "estado", sortDir: "desc", showLegend: true, showValues: false });
  const [previewData, setPreviewData] = useState<PreviewPoint[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dashboardVistas, setDashboardVistas] = useState<VistaChart[]>([]);
  const [filterClientes, setFilterClientes] = useState<{ id: number; nombre: string }[]>([]);
  const [filterEstados, setFilterEstados] = useState<{ id: number; nombre: string }[]>([]);

  const setCfg = useCallback((patch: Partial<VistaConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

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

  useEffect(() => {
    api.get("/vistas/options").then((res) => {
      setFilterClientes(res.data.clientes || []);
      setFilterEstados(res.data.estados || []);
    }).catch(() => {});
  }, []);

  // Load vistas marked as on-dashboard after fetching the list.
  useEffect(() => {
    if (vistasLoading) return;
    const onDashboard = vistas.filter((v) => (v.config as any).onDashboard);
    onDashboard.forEach((v) => {
      if (dashboardVistas.some((dv) => dv.id === v.id)) return;
      fetchChartData(v).then((data) => {
        setDashboardVistas((prev) => {
          if (prev.some((dv) => dv.id === v.id)) return prev;
          return [...prev, { ...v, data, loading: false }];
        });
      });
    });
  }, [vistas, vistasLoading]);

  const persistLayout = async (vista: Vista, patch: Partial<VistaConfig>) => {
    try {
      const config = { ...vista.config, ...patch };
      const res = await api.put(`/vistas/${vista.id}`, { config });
      setVistas((prev) => prev.map((v) => (v.id === vista.id ? res.data : v)));
      setDashboardVistas((prev) => prev.map((dv) => (dv.id === vista.id ? { ...dv, config: res.data.config } : dv)));
    } catch {}
  };

  const addToDashboard = async (vista: Vista) => {
    if (dashboardVistas.some((dv) => dv.id === vista.id)) return;
    await persistLayout(vista, { ...vista.config, onDashboard: true });
    const data = await fetchChartData(vista);
    setDashboardVistas((prev) => [...prev, { ...vista, config: { ...vista.config, onDashboard: true }, data, loading: false }]);
  };

  const removeFromDashboard = (id: number) => {
    const vista = vistas.find((v) => v.id === id);
    if (vista) persistLayout(vista, { ...vista.config, onDashboard: false });
    setDashboardVistas((prev) => prev.filter((dv) => dv.id !== id));
  };

  const handleLayoutChange = (layout: GridItemLayout[]) => {
    layout.forEach((l) => {
      const vista = vistas.find((v) => v.id.toString() === l.i);
      if (!vista) return;
      const cfg = vista.config as any;
      if (cfg.x !== l.x || cfg.y !== l.y || cfg.w !== l.w || cfg.h !== l.h) {
        persistLayout(vista, { ...vista.config, x: l.x, y: l.y, w: l.w, h: l.h });
      }
    });
  };

  const resetForm = () => {
    setEditId(null);
    setNombre("");
    setConfig({ chartType: "bar", groupBy: "estado", sortDir: "desc", showLegend: true, showValues: false });
    setPreviewData(null);
  };

  const openNewBuilder = () => {
    resetForm();
    setShowBuilder(true);
    setVistaTab("dashboard");
  };

  const handleEdit = (vista: Vista) => {
    setEditId(vista.id);
    setNombre(vista.nombre);
    setConfig({ ...vista.config });
    setPreviewData(null);
    setShowBuilder(true);
    setVistaTab("dashboard");
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
      const res = await api.post("/vistas/preview", { config });
      setPreviewData(res.data.data ?? []);
    } catch { setPreviewData(null); }
    finally { setPreviewLoading(false); }
  };

  const handleSave = async () => {
    if (!nombre.trim()) return;
    setSaveLoading(true);
    try {
      if (editId) {
        await api.put(`/vistas/${editId}`, { nombre: nombre.trim(), config });
      } else {
        await api.post("/vistas", { nombre: nombre.trim(), config });
      }
      resetForm();
      setShowBuilder(false);
      fetchVistas();
      setVistaTab("dashboard");
    } catch {} finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Tabs value={vistaTab} onValueChange={setVistaTab}>
          <TabsList>
            <TabsTrigger value="dashboard">Mis Vistas</TabsTrigger>
            <TabsTrigger value="predefinidos">Reportes Predefinidos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-4 w-4" /> Añadir vista
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end" side="bottom">
              <VistasPopoverContent
                vistas={vistas}
                vistasLoading={vistasLoading}
                dashboardVistas={dashboardVistas}
                onAdd={addToDashboard}
                onRemove={removeFromDashboard}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </PopoverContent>
          </Popover>
          <Button variant="default" size="sm" onClick={openNewBuilder}>
            <Plus className="mr-1 h-4 w-4" /> Nueva
          </Button>
        </div>
      </div>

      {showBuilder ? (
        <VistaBuilder
          nombre={nombre}
          setNombre={setNombre}
          config={config}
          setCfg={setCfg}
          previewData={previewData}
          previewLoading={previewLoading}
          onPreview={handlePreview}
          onSave={handleSave}
          saveLoading={saveLoading}
          editId={editId}
          onCancel={() => { resetForm(); setShowBuilder(false); }}
          clientes={filterClientes}
          estados={filterEstados}
        />
      ) : vistaTab === "dashboard" ? (
        <GridDashboard
          dashboardVistas={dashboardVistas}
          onRemove={removeFromDashboard}
          onLayoutChange={handleLayoutChange}
        />
      ) : (
        <PredefinedReports />
      )}
    </div>
  );
}

function VistasPopoverContent({
  vistas, vistasLoading, dashboardVistas,
  onAdd, onRemove, onEdit, onDelete,
}: any) {
  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {vistasLoading ? (
        <p className="text-xs text-muted-foreground p-2">Cargando...</p>
      ) : vistas.length === 0 ? (
        <p className="text-xs text-muted-foreground p-2">No hay vistas. Crea una nueva.</p>
      ) : (
        vistas.map((vista: any) => {
          const isOnDashboard = dashboardVistas.some((dv: any) => dv.id === vista.id);
          return (
            <div
              key={vista.id}
              className="flex items-center gap-2 rounded-md border p-2 text-xs bg-card hover:bg-accent"
            >
              {chartTypeIcon(vista.config.chartType)}
              <span className="flex-1 truncate font-medium">{vista.nombre}</span>
              <span className="text-[10px] text-muted-foreground">{groupByLabel(vista.config.groupBy)}</span>
              <div className="flex gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => isOnDashboard ? onRemove(vista.id) : onAdd(vista)} title={isOnDashboard ? "Quitar del panel" : "Añadir al panel"}>
                  {isOnDashboard ? <X className="h-3 w-3 text-destructive" /> : <Plus className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEdit(vista)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onDelete(vista.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function GridDashboard({
  dashboardVistas,
  onRemove, onLayoutChange,
}: any) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(600);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setGridWidth(el.clientWidth || 600);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [dashboardVistas.length]);

  const layout: GridItemLayout[] = dashboardVistas.map((dv: any) => {
    const cfg = dv.config || {};
    return {
      i: dv.id.toString(),
      x: cfg.x ?? 0,
      y: cfg.y ?? 0,
      w: cfg.w ?? 2,
      h: cfg.h ?? 2,
      minW: 1,
      minH: 2,
      maxW: 6,
    };
  });

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 500 }}>
      <div className="flex-1" ref={gridRef}>
        {dashboardVistas.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 min-h-[200px]">
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sin vistas en el panel. Usa "Añadir vista" para añadir una.
            </p>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={layout as any}
            cols={6}
            rowHeight={120}
            width={gridWidth}
            margin={[12, 12]}
            draggableHandle=".grid-drag-handle"
            isDraggable
            isResizable
            onLayoutChange={onLayoutChange as any}
            useCSSTransforms={false}
            {...({ compactType: "vertical" } as any)}
          >
            {dashboardVistas.map((dv: any) => (
              <div key={dv.id.toString()} className="relative group">
                <div className="grid-drag-handle absolute -top-1 left-1/2 -translate-x-1/2 z-10 cursor-move rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  ⋮⋮
                </div>
                <div className="h-full">
                  <ChartWidget vista={dv} fillHeight />
                </div>
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-background/80 text-destructive hover:bg-destructive/10 transition-opacity z-10"
                  onClick={(e) => { e.stopPropagation(); onRemove(dv.id); }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}

function BuilderField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function VistaBuilder({
  nombre, setNombre, config, setCfg, previewData, previewLoading,
  onPreview, onSave, saveLoading, editId, onCancel, clientes, estados,
}: {
  nombre: string;
  setNombre: (v: string) => void;
  config: VistaConfig;
  setCfg: (patch: Partial<VistaConfig>) => void;
  previewData: PreviewPoint[] | null;
  previewLoading: boolean;
  onPreview: () => void;
  onSave: () => void;
  saveLoading: boolean;
  editId: number | null;
  onCancel: () => void;
  clientes: { id: number; nombre: string }[];
  estados: { id: number; nombre: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{editId ? "Editar Vista" : "Nueva Vista"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <BuilderField label="Nombre de la Vista">
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Contenedores por Cliente" />
          </BuilderField>
          <BuilderField label="Tipo de Gráfico">
            <Select value={config.chartType} onValueChange={(v) => setCfg({ chartType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BuilderField>
          <BuilderField label="Agrupar por">
            <Select value={config.groupBy} onValueChange={(v) => setCfg({ groupBy: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GROUP_BY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BuilderField>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <BuilderField label="Cliente (filtro)">
            <Select value={config.clienteId || "todos"} onValueChange={(v) => setCfg({ clienteId: v === "todos" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BuilderField>
          <BuilderField label="Estado (filtro)">
            <Select value={config.estadoId || "todos"} onValueChange={(v) => setCfg({ estadoId: v === "todos" ? undefined : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </BuilderField>
          <BuilderField label="Ordenar">
            <Select value={config.sortDir || "desc"} onValueChange={(v) => setCfg({ sortDir: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mayor a menor</SelectItem>
                <SelectItem value="asc">Menor a mayor</SelectItem>
              </SelectContent>
            </Select>
          </BuilderField>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <BuilderField label="Límite de filas">
            <Input type="number" min={0} value={config.limit ?? ""} onChange={(e) => setCfg({ limit: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Sin límite" />
          </BuilderField>
          {config.groupBy === "movimientos_por_dia" && (
            <BuilderField label="Días">
              <Input type="number" min={1} value={config.days ?? 14} onChange={(e) => setCfg({ days: parseInt(e.target.value) || 14 })} />
            </BuilderField>
          )}
          <BuilderField label="Paleta de colores">
            <div className="flex gap-1.5 pt-1.5">
              {PALETTES.map((pal, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCfg({ customColors: pal })}
                  className={cn("flex h-6 w-10 items-center rounded border overflow-hidden", config.customColors === pal && "ring-2 ring-primary")}
                >
                  {pal.slice(0, 4).map((c, j) => <span key={j} className="flex-1 h-full" style={{ backgroundColor: c }} />)}
                </button>
              ))}
              <button type="button" onClick={() => setCfg({ customColors: undefined })} className="px-1.5 text-[10px] text-muted-foreground hover:text-foreground">Por defecto</button>
            </div>
          </BuilderField>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={config.showLegend ?? true} onCheckedChange={(v) => setCfg({ showLegend: v })} />
            <Label className="text-xs cursor-pointer">Mostrar leyenda</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.showValues ?? false} onCheckedChange={(v) => setCfg({ showValues: v })} />
            <Label className="text-xs cursor-pointer">Mostrar valores</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.peligrosaOnly ?? false} onCheckedChange={(v) => setCfg({ peligrosaOnly: v })} />
            <Label className="text-xs cursor-pointer">Solo peligrosas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={config.alquiladoOnly ?? false} onCheckedChange={(v) => setCfg({ alquiladoOnly: v })} />
            <Label className="text-xs cursor-pointer">Solo alquilados</Label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onPreview} disabled={previewLoading}>
            <Eye className="mr-1 h-4 w-4" />
            {previewLoading ? "Cargando..." : "Previsualizar"}
          </Button>
          <Button onClick={onSave} disabled={saveLoading || !nombre.trim()}>
            {saveLoading ? "Guardando..." : editId ? "Guardar Cambios" : "Guardar Vista"}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>

        {previewData && previewData.length > 0 && (
          <div className="mt-2">
            <ChartWidget vista={{ id: -1, nombre: "Vista previa", config, data: previewData, loading: false }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PredefinedReports() {
  const [estadoDist, setEstadoDist] = useState<{ nombre: string; color: string; cantidad: number }[]>([]);
  const [tiposIso, setTiposIso] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [peligrosa, setPeligrosa] = useState<{ tipo: string; cantidad: number }[]>([]);
  const [actividad, setActividad] = useState<any[]>([]);
  const [contenedores, setContenedores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

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

  const alquiladosData = useMemo(() => {
    const alq = contenedores.filter((c: any) => c.alquilado);
    const vencidos = alq.filter((c: any) => c.fecha_devolucion_alquiler && new Date(c.fecha_devolucion_alquiler) < new Date());
    return { alquilados: alq.length, vencidos: vencidos.length, enPlazo: alq.length - vencidos.length };
  }, [contenedores]);

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="estados">
        <TabsList className="flex-wrap">
          <TabsTrigger value="estados">Distribución por Estado</TabsTrigger>
          <TabsTrigger value="tipos">Tipos ISO</TabsTrigger>
          <TabsTrigger value="peligrosa">Mercancía Peligrosa</TabsTrigger>
          <TabsTrigger value="clientes">Por Cliente</TabsTrigger>
          <TabsTrigger value="destino">Por Destino</TabsTrigger>
          <TabsTrigger value="alquilados">Alquilados</TabsTrigger>
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
          <ReportCharts type="bar" title="Contenedores por Cliente" data={porCliente} />
        </TabsContent>
        <TabsContent value="destino">
          <ReportCharts type="bar" title="Contenedores por Destino" data={porDestino} />
        </TabsContent>
        <TabsContent value="alquilados">
          <ReportCharts
            type="pie"
            title="Alquileres"
            data={[
              { name: "En plazo", value: alquiladosData.enPlazo },
              { name: "Vencidos", value: alquiladosData.vencidos },
            ]}
          />
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
