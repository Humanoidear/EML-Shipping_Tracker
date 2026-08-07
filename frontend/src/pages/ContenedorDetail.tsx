import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OpenStreetMap } from "@/components/map/OpenStreetMap";
import { QRGenerator } from "@/components/qr/QRGenerator";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft, Ship, User, Box, Scale, AlertTriangle, MapPin,
  Calendar, FileText, Pencil, Trash2, Plus, GripVertical,
  Clock, FileSpreadsheet, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Contenedor {
  id: number;
  matricula: string;
  cliente?: { id: number; nombre: string } | null;
  tipo_iso?: string;
  origen?: string;
  estado?: { id: number; nombre: string; color: string } | null;
  mercancia_peligrosa: boolean;
  peso_kg?: number;
  mercancia?: string;
  notas?: string;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  created_at: string;
  updated_at: string;
}

interface Movimiento {
  id: number;
  estado_anterior?: { nombre: string } | null;
  estado_nuevo?: { nombre: string } | null;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  notas?: string;
  username?: string;
  created_at: string;
  fecha?: string;
}

interface TiempoRuta {
  dias: number;
  horas: number;
  inicio: string;
  ultimo: string;
}

interface GrupoContenedor {
  id: number;
  matricula: string;
  mercancia_peligrosa: boolean;
}

interface Grupo {
  id: number;
  nombre: string;
  estado_id: number;
  ubicacion?: string;
  contenedores: GrupoContenedor[];
}

export default function ContenedorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contenedor, setContenedor] = useState<Contenedor | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [tiempoRuta, setTiempoRuta] = useState<TiempoRuta | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const contenedorRef = useRef(contenedor);
  contenedorRef.current = contenedor;
  const pageRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    if (!id) return;
    Promise.all([
      api.get(`/contenedores/${id}`),
      api.get(`/contenedores/${id}/movimientos`),
      api.get(`/contenedores/${id}/tiempo-ruta`).catch(() => ({ data: null })),
      api.get("/grupos").catch(() => ({ data: [] })),
    ]).then(([contRes, movRes, rutaRes, grpRes]) => {
      setContenedor(contRes.data);
      setMovimientos(movRes.data);
      setTiempoRuta(rutaRes.data);
      setGrupos(grpRes.data);
    }).catch(console.error);
  }, [id]);

  useEffect(() => { fetchData(); }, [id]);

  const containerGrupo = useMemo(() => {
    if (!contenedor) return null;
    const numId = typeof contenedor.id === "string" ? parseInt(contenedor.id, 10) : contenedor.id;
    return grupos.find((g) => g.contenedores.some((c) => c.id === numId)) || null;
  }, [grupos, contenedor]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const current = contenedorRef.current;
    if (!current) return;
    await api.post(`/contenedores/${current.id}/movimientos`, {
      ubicacion_lat: lat,
      ubicacion_lng: lng,
      notas: "",
    });
    fetchData();
  }, [fetchData]);

  const handleAddLocation = useCallback(async (_movId: number, lat: number, lng: number, notas?: string, fecha?: string) => {
    const current = contenedorRef.current;
    if (!current) return;
    await api.post(`/contenedores/${current.id}/movimientos`, {
      ubicacion_lat: lat,
      ubicacion_lng: lng,
      notas: notas || "",
      fecha: fecha || undefined,
    });
    setShowAddLocation(false);
    fetchData();
  }, [fetchData]);

  const handleEditLocation = useCallback(async (movId: number, lat: number, lng: number, notas: string, fecha?: string) => {
    try {
      const res = await api.put(`/contenedores/${id}/movimientos/${movId}`, {
        ubicacion_lat: lat,
        ubicacion_lng: lng,
        notas,
        fecha: fecha || undefined,
      });
      setMovimientos((prev) => prev.map((m) => (m.id === movId ? res.data : m)));
      setEditingMov(null);
      fetchData();
    } catch (err) {
      console.error("Edit location error:", err);
    }
  }, [id, fetchData]);

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este contenedor permanentemente?")) return;
    try {
      await api.delete(`/contenedores/${id}`);
      navigate("/");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error al eliminar el contenedor");
    }
  };

  const handleDeleteLocation = async (movId: number) => {
    if (!confirm("¿Eliminar este punto de ubicación?")) return;
    try {
      await api.delete(`/contenedores/${id}/movimientos/${movId}`);
      setMovimientos((prev) => prev.filter((m) => m.id !== movId));
      fetchData();
    } catch {
      alert("Error al eliminar ubicación");
    }
  };

  const handleExportExcel = () => {
    if (!contenedor) return;

    const contData = [
      ["Campo", "Valor"],
      ["Matrícula", contenedor.matricula],
      ["Cliente", contenedor.cliente?.nombre || "-"],
      ["Tipo ISO", contenedor.tipo_iso || "-"],
      ["Origen", contenedor.origen || "-"],
      ["Estado", contenedor.estado?.nombre || "-"],
      ["Mercancía peligrosa", contenedor.mercancia_peligrosa ? "Sí" : "No"],
      ["Peso (kg)", contenedor.peso_kg ?? "-"],
      ["Mercancía", contenedor.mercancia || "-"],
      ["Notas", contenedor.notas || "-"],
      ["Creado", new Date(contenedor.created_at).toLocaleString()],
      ...(tiempoRuta ? [
        ["Tiempo en ruta", `${tiempoRuta.dias} días (${tiempoRuta.horas} horas)`],
        ["Inicio ruta", new Date(tiempoRuta.inicio).toLocaleString()],
        ["Última actualización", new Date(tiempoRuta.ultimo).toLocaleString()],
      ] : []),
    ];

    const movData = [
      ["ID", "Estado anterior", "Estado nuevo", "Latitud", "Longitud", "Notas", "Usuario", "Fecha"],
      ...movimientos.map((m) => [
        m.id,
        m.estado_anterior?.nombre || "-",
        m.estado_nuevo?.nombre || "-",
        m.ubicacion_lat ?? "-",
        m.ubicacion_lng ?? "-",
        m.notas || "-",
        m.username || "Sistema",
        m.fecha ? new Date(m.fecha).toLocaleString() : new Date(m.created_at).toLocaleString(),
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const wsCont = XLSX.utils.aoa_to_sheet(contData);
    const wsMov = XLSX.utils.aoa_to_sheet(movData);
    XLSX.utils.book_append_sheet(wb, wsCont, "Contenedor");
    XLSX.utils.book_append_sheet(wb, wsMov, "Movimientos");
    XLSX.writeFile(wb, `${contenedor.matricula}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!pageRef.current || !contenedor) return;
    const canvas = await html2canvas(pageRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = -heightLeft + imgHeight - pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${contenedor.matricula}.pdf`);
  };

  if (!contenedor) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const mapMarkers = movimientos
    .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
    .map((m) => ({
      lat: m.ubicacion_lat!,
      lng: m.ubicacion_lng!,
      label: `${m.estado_nuevo?.nombre || "Ubicación"} - ${new Date(m.created_at).toLocaleDateString()}`,
    }));

  const locationsWithCoords = movimientos.filter((m) => m.ubicacion_lat && m.ubicacion_lng);

  const mapCenter: [number, number] | undefined = contenedor.ubicacion_lat && contenedor.ubicacion_lng
    ? [contenedor.ubicacion_lat, contenedor.ubicacion_lng]
    : undefined;

  return (
    <div ref={pageRef} className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} title="Eliminar contenedor">
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contenedor.matricula}</h1>
            {contenedor.estado && (
              <Badge style={{ backgroundColor: contenedor.estado.color }} className="text-white">
                {contenedor.estado.nombre}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="mr-1 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="movimientos">Historial</TabsTrigger>
          <TabsTrigger value="qr">Código QR</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Datos del Contenedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Matrícula:</span>
                  <span className="font-mono font-medium">{contenedor.matricula}</span>
                </div>
                {contenedor.cliente && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cliente:</span>
                    <span>{contenedor.cliente.nombre}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Tipo ISO:</span>
                  <span>{contenedor.tipo_iso || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Scale className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Peso:</span>
                  <span>{contenedor.peso_kg != null ? `${contenedor.peso_kg} kg` : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Origen:</span>
                  <span>{contenedor.origen || "-"}</span>
                </div>
                {contenedor.mercancia_peligrosa && (
                  <div className="flex items-center gap-2 text-sm text-orange-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Mercancía peligrosa</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Mercancía:</span>
                    <span>{contenedor.mercancia || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Notas:</span>
                    <span className="whitespace-pre-wrap">{contenedor.notas || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Creado:</span>
                    <span>{new Date(contenedor.created_at).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {containerGrupo && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      Grupo: {containerGrupo.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {containerGrupo.ubicacion && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Ubicación:</span>
                        <span>{containerGrupo.ubicacion}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Contenedores en el grupo ({containerGrupo.contenedores.length}):
                      </p>
                      <div className="space-y-1">
                        {containerGrupo.contenedores.map((c) => (
                          <div key={c.id} className="flex items-center gap-1.5 text-sm">
                            <Ship className="h-3 w-3 text-muted-foreground shrink-0" />
                            <Link
                              to={`/contenedores/${c.id}`}
                              className={cn(
                                "font-mono hover:underline",
                                c.id === contenedor.id ? "font-bold text-primary" : "text-muted-foreground"
                              )}
                            >
                              {c.matricula}
                            </Link>
                            {c.id === contenedor.id && (
                              <span className="text-[10px] text-primary">(actual)</span>
                            )}
                            {c.mercancia_peligrosa && (
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {tiempoRuta && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tiempo en Ruta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Duración:</span>
                      <span className="font-medium">{tiempoRuta.dias} días ({tiempoRuta.horas} horas en total)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Inicio:</span>
                      <span>{new Date(tiempoRuta.inicio).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Última actualización:</span>
                      <span>{new Date(tiempoRuta.ultimo).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mapa">
          <div className="flex gap-4" style={{ height: 500 }}>
            <div className="flex-1 rounded-lg border overflow-hidden">
              <OpenStreetMap
                lat={contenedor.ubicacion_lat}
                lng={contenedor.ubicacion_lng}
                markers={mapMarkers}
                center={mapCenter}
                zoom={6}
                onLocationSelect={handleMapClick}
              />
            </div>
            <div className="w-72 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Ubicaciones</h3>
                <Button variant="outline" size="sm" onClick={() => setShowAddLocation(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Agregar
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 rounded-md border p-2">
                {locationsWithCoords.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Sin ubicaciones. Haz clic en el mapa o presiona "Agregar".
                  </p>
                ) : (
                  locationsWithCoords.map((mov) => (
                    <div key={mov.id} className="flex items-center gap-2 rounded-md border p-2 text-xs">
                      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono truncate">{mov.ubicacion_lat?.toFixed(5)}, {mov.ubicacion_lng?.toFixed(5)}</p>
                        <p className="text-muted-foreground truncate">{mov.estado_nuevo?.nombre || "Ubicación"} — {new Date(mov.created_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingMov(mov)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteLocation(mov.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movimientos">
          <Card>
            <CardContent className="pt-6">
              {movimientos.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
              ) : (
                <div className="relative space-y-0">
                  {movimientos.map((mov, i) => (
                    <div key={mov.id} className="flex gap-4 pb-6">
                      <div className="flex flex-col items-center">
                        <div
                          className="h-3 w-3 rounded-full border-2"
                          style={{ borderColor: "hsl(var(--primary))", backgroundColor: i === 0 ? "hsl(var(--primary))" : "transparent" }}
                        />
                        {i < movimientos.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 text-sm">
                          {mov.estado_anterior && (
                            <span className="text-muted-foreground">{mov.estado_anterior.nombre}</span>
                          )}
                          {mov.estado_anterior && <span className="text-muted-foreground">→</span>}
                          <span className="font-medium">{mov.estado_nuevo?.nombre || "-"}</span>
                        </div>
                        {mov.notas && (
                          <p className="mt-1 text-xs text-muted-foreground">{mov.notas}</p>
                        )}
                        {mov.ubicacion_lat && mov.ubicacion_lng && (
                          <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                            {mov.ubicacion_lat.toFixed(5)}, {mov.ubicacion_lng.toFixed(5)}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(mov.created_at).toLocaleString()} — {mov.username || "Sistema"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr">
          <Card>
            <CardContent className="flex justify-center py-8">
              <QRGenerator matricula={contenedor.matricula} size={220} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingMov && (
        <EditLocationDialog
          movimiento={editingMov}
          onSave={handleEditLocation}
          onClose={() => setEditingMov(null)}
        />
      )}

      {showAddLocation && (
        <EditLocationDialog
          onSave={handleAddLocation}
          onClose={() => setShowAddLocation(false)}
        />
      )}
    </div>
  );
}

function EditLocationDialog({
  movimiento,
  onSave,
  onClose,
}: {
  movimiento?: Movimiento;
  onSave: (movId: number, lat: number, lng: number, notas: string, fecha?: string) => Promise<void>;
  onClose: () => void;
}) {
  const [lat, setLat] = useState(movimiento?.ubicacion_lat?.toString() || "");
  const [lng, setLng] = useState(movimiento?.ubicacion_lng?.toString() || "");
  const [notas, setNotas] = useState(movimiento?.notas || "");
  const [fecha, setFecha] = useState(
    movimiento?.fecha
      ? new Date(movimiento.fecha).toISOString().slice(0, 16)
      : movimiento?.created_at
        ? new Date(movimiento.created_at).toISOString().slice(0, 16)
        : ""
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert("Coordenadas inválidas");
      return;
    }
    setLoading(true);
    try {
      await onSave(
        movimiento?.id || 0,
        latNum,
        lngNum,
        notas,
        fecha ? new Date(fecha).toISOString() : undefined,
      );
    } catch (err) {
      console.error("Save location error:", err);
      alert("Error al guardar ubicación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{movimiento ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Latitud *</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.3874" required />
            </div>
            <div className="space-y-2">
              <Label>Longitud *</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="2.1686" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fecha del punto</Label>
            <Input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
