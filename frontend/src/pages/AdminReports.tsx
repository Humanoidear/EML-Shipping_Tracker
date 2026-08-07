import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ReportCharts } from "@/components/charts/ReportCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  PieChart,
  LineChart,
  Plus,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
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
    case "bar":
      return <BarChart3 className="h-6 w-6" />;
    case "pie":
      return <PieChart className="h-6 w-6" />;
    case "line":
      return <LineChart className="h-6 w-6" />;
    default:
      return <BarChart3 className="h-6 w-6" />;
  }
}

function chartTypeLabel(type: string) {
  return CHART_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function groupByLabel(value: string) {
  return GROUP_BY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function PreviewChart({
  type,
  data,
  title,
}: {
  type: string;
  data: PreviewPoint[];
  title: string;
}) {
  if (type === "line") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">{title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ReLineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(217 19% 24%)"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "hsl(215 20% 65%)" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(215 20% 65%)" }}
            />
            <ReTooltip
              contentStyle={{
                backgroundColor: "hsl(220 20% 12%)",
                border: "1px solid hsl(217 19% 24%)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(210 40% 98%)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <ReportCharts type={type as "bar" | "pie"} title={title} data={data} />
  );
}

export default function AdminReports() {
  const [vistas, setVistas] = useState<Vista[]>([]);
  const [vistasLoading, setVistasLoading] = useState(true);

  const [vistaTab, setVistaTab] = useState("lista");
  const [editId, setEditId] = useState<number | null>(null);

  const [nombre, setNombre] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [groupBy, setGroupBy] = useState("estado");

  const [previewData, setPreviewData] = useState<PreviewPoint[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [estadoDist, setEstadoDist] = useState<
    { nombre: string; color: string; cantidad: number }[]
  >([]);
  const [tiposIso, setTiposIso] = useState<
    { tipo: string; cantidad: number }[]
  >([]);
  const [peligrosa, setPeligrosa] = useState<
    { tipo: string; cantidad: number }[]
  >([]);
  const [actividad, setActividad] = useState<any[]>([]);

  const fetchVistas = () => {
    setVistasLoading(true);
    api
      .get("/vistas")
      .then((res) => setVistas(res.data))
      .catch(() => {})
      .finally(() => setVistasLoading(false));
  };

  useEffect(() => {
    fetchVistas();
    Promise.all([
      api.get("/reportes/estados-distribucion"),
      api.get("/reportes/tipos-iso"),
      api.get("/reportes/peligrosa"),
      api.get("/reportes/actividad"),
    ]).then(([estRes, isoRes, pelRes, actRes]) => {
      setEstadoDist(estRes.data);
      setTiposIso(isoRes.data);
      setPeligrosa(pelRes.data);
      setActividad(actRes.data);
    });
  }, []);

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
    } catch {}
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.post("/vistas/preview", {
        config: { chartType, groupBy },
      });
      setPreviewData(res.data.data ?? []);
    } catch {
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
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
      setVistaTab("lista");
    } catch {} finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Reportes y Estadísticas</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vistas Personalizadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={vistaTab} onValueChange={setVistaTab}>
            <TabsList>
              <TabsTrigger value="lista">Vistas</TabsTrigger>
              <TabsTrigger value="nueva">
                {editId ? "Editar Vista" : "Nueva Vista"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lista">
              {vistasLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cargando vistas...
                </p>
              ) : vistas.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Eye className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No hay vistas guardadas
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      resetForm();
                      setVistaTab("nueva");
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Crear primera vista
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {vistas.map((vista) => (
                    <Card
                      key={vista.id}
                      className="group cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => {
                        setNombre(vista.nombre);
                        setChartType(vista.config.chartType);
                        setGroupBy(vista.config.groupBy);
                        setEditId(vista.id);
                        handlePreview();
                      }}
                    >
                      <CardContent className="flex items-center gap-4 p-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          {chartTypeIcon(vista.config.chartType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {vista.nombre}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {chartTypeLabel(vista.config.chartType)} —{" "}
                            {groupByLabel(vista.config.groupBy)}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(vista);
                            }}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(vista.id);
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <button
                    className="flex min-h-[80px] items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
                    onClick={() => {
                      resetForm();
                      setVistaTab("nueva");
                    }}
                  >
                    <Plus className="mr-2 h-5 w-5" /> Nueva Vista
                  </button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="nueva">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="vista-nombre">Nombre de la Vista</Label>
                    <Input
                      id="vista-nombre"
                      placeholder="Ej: Contenedores por Cliente"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vista-chart">Tipo de Gráfico</Label>
                    <Select
                      value={chartType}
                      onValueChange={(v) => {
                        setChartType(v);
                        setPreviewData(null);
                      }}
                    >
                      <SelectTrigger id="vista-chart">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHART_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vista-groupby">Agrupar por</Label>
                    <Select
                      value={groupBy}
                      onValueChange={(v) => {
                        setGroupBy(v);
                        setPreviewData(null);
                      }}
                    >
                      <SelectTrigger id="vista-groupby">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROUP_BY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewLoading}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    {previewLoading ? "Cargando..." : "Previsualizar"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveLoading || !nombre.trim()}
                  >
                    {saveLoading
                      ? "Guardando..."
                      : editId
                        ? "Guardar Cambios"
                        : "Guardar Vista"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      resetForm();
                      setVistaTab("lista");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>

                {previewData && previewData.length > 0 && (
                  <PreviewChart
                    type={chartType}
                    title={nombre || "Vista previa"}
                    data={previewData}
                  />
                )}

                {previewData && previewData.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin datos para la configuración seleccionada.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Reportes Predefinidos</h2>

      <Tabs defaultValue="estados">
        <TabsList>
          <TabsTrigger value="estados">Distribución por Estado</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Contenedor</TabsTrigger>
          <TabsTrigger value="peligrosa">Mercancía Peligrosa</TabsTrigger>
          <TabsTrigger value="actividad">Actividad Reciente</TabsTrigger>
        </TabsList>

        <TabsContent value="estados">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts
              type="bar"
              title="Contenedores por Estado"
              data={estadoDist.map((e) => ({
                name: e.nombre,
                value: e.cantidad,
                color: e.color,
              }))}
            />
            <ReportCharts
              type="pie"
              title="Distribución Porcentual"
              data={estadoDist.map((e) => ({
                name: e.nombre,
                value: e.cantidad,
                color: e.color,
              }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="tipos">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts
              type="bar"
              title="Contenedores por Tipo ISO"
              data={tiposIso.map((t) => ({ name: t.tipo, value: t.cantidad }))}
            />
            <ReportCharts
              type="pie"
              title="Distribución de Tipos ISO"
              data={tiposIso.map((t) => ({ name: t.tipo, value: t.cantidad }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="peligrosa">
          <div className="grid gap-6 lg:grid-cols-2">
            <ReportCharts
              type="pie"
              title="Mercancía Peligrosa vs Normal"
              data={peligrosa.map((p) => ({
                name: p.tipo,
                value: p.cantidad,
              }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="actividad">
          <Card>
            <CardContent className="pt-6">
              {actividad.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Sin actividad registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {actividad.slice(0, 50).map((mov: any) => (
                    <div
                      key={mov.id}
                      className="flex items-center gap-3 rounded-md border p-3 text-sm"
                    >
                      <span className="font-mono font-medium">
                        {mov.contenedor_id}
                      </span>
                      {mov.estado_anterior && (
                        <span className="text-muted-foreground">
                          {mov.estado_anterior.nombre} →
                        </span>
                      )}
                      <span className="font-medium">
                        {mov.estado_nuevo?.nombre}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(mov.created_at).toLocaleString()} —{" "}
                        {mov.username}
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
