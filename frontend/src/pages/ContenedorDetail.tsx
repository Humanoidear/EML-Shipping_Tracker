import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePageControls } from "@/contexts/PageControlsContext";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { OpenStreetMap } from "@/components/map/OpenStreetMap";
import { LocationInput } from "@/components/map/LocationInput";
import { QRGenerator } from "@/components/qr/QRGenerator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Ship, User, Box, Scale, AlertTriangle, MapPin,
  Calendar, FileText, Pencil, Trash2, Plus, GripVertical,
  Camera, Paperclip, FileSpreadsheet, Layers, Clock, Image,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

async function captureMapImage(coords: { ubicacion_lat: number; ubicacion_lng: number }[]): Promise<string | null> {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-10000px;top:0;width:700px;height:460px;z-index:-1;";
  document.body.appendChild(el);

  try {
    const map = L.map(el).setView([coords[0].ubicacion_lat, coords[0].ubicacion_lng], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "OSM",
    }).addTo(map);

    const latlngs = coords.map((c) => [c.ubicacion_lat, c.ubicacion_lng] as [number, number]);
    L.polyline(latlngs, { color: "#3b82f6", weight: 3 }).addTo(map);
    latlngs.forEach(([lat, lng]) => {
      L.circleMarker([lat, lng], { radius: 5, color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 1 }).addTo(map);
    });
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
    }

    await new Promise((r) => setTimeout(r, 1200));

    const canvas = await html2canvas(el, { useCORS: true, scale: 1.5 });
    map.remove();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    try { L.map(el).remove(); } catch { /* noop */ }
    return null;
  } finally {
    el.remove();
  }
}

interface Contenedor {
  id: number;
  matricula: string;
  cliente?: { id: number; nombre: string } | null;
  tipo_iso?: string;
  origen?: string;
  origen_lat?: number;
  origen_lng?: number;
  estado?: { id: number; nombre: string; color: string } | null;
  mercancia_peligrosa: boolean;
  peso_kg?: number;
  mercancia?: string;
  destino?: string;
  destino_lat?: number;
  destino_lng?: number;
  notas?: string;
  alquilado?: boolean;
  fecha_inicio_alquiler?: string;
  fecha_devolucion_alquiler?: string;
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
  const { setLeftContent } = usePageControls();
  const [contenedor, setContenedor] = useState<Contenedor | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [tiempoRuta, setTiempoRuta] = useState<TiempoRuta | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [editingMov, setEditingMov] = useState<Movimiento | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [focusedLocationId, setFocusedLocationId] = useState<number | null>(null);

  useEffect(() => {
    if (focusedLocationId != null) {
      const el = document.getElementById(`loc-${focusedLocationId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusedLocationId]);
  const contenedorRef = useRef(contenedor);
  contenedorRef.current = contenedor;

  const [editMatricula, setEditMatricula] = useState("");
  const [editClienteId, setEditClienteId] = useState<string>("");
  const [editTipoIso, setEditTipoIso] = useState("");
  const [editOrigen, setEditOrigen] = useState("");
  const [editOrigenLat, setEditOrigenLat] = useState<number | undefined>();
  const [editOrigenLng, setEditOrigenLng] = useState<number | undefined>();
  const [editDestino, setEditDestino] = useState("");
  const [editDestinoLat, setEditDestinoLat] = useState<number | undefined>();
  const [editDestinoLng, setEditDestinoLng] = useState<number | undefined>();
  const [editPeso, setEditPeso] = useState("");
  const [editMercancia, setEditMercancia] = useState("");
  const [editNotas, setEditNotas] = useState("");
  const [editPeligrosa, setEditPeligrosa] = useState(false);
  const [editAlquilado, setEditAlquilado] = useState(false);
  const [editFechaInicio, setEditFechaInicio] = useState("");
  const [editFechaDevolucion, setEditFechaDevolucion] = useState("");
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

  useEffect(() => {
    setLeftContent(
      <h1 className="text-lg font-bold">
        {contenedor ? contenedor.matricula : "Contenedor"}
      </h1>
    );
    return () => setLeftContent(null);
  }, [contenedor, setLeftContent]);

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

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/contenedores/${id}`, {
        matricula: editMatricula,
        cliente_id: editClienteId ? parseInt(editClienteId) : null,
        tipo_iso: editTipoIso,
        origen: editOrigen,
        origen_lat: editOrigenLat ?? null,
        origen_lng: editOrigenLng ?? null,
        destino: editDestino,
        destino_lat: editDestinoLat ?? null,
        destino_lng: editDestinoLng ?? null,
        peso_kg: editPeso ? parseFloat(editPeso) : null,
        mercancia: editMercancia,
        notas: editNotas,
        alquilado: editAlquilado,
        mercancia_peligrosa: editPeligrosa,
        fecha_inicio_alquiler: editAlquilado && editFechaInicio ? new Date(editFechaInicio).toISOString() : null,
        fecha_devolucion_alquiler: editAlquilado && editFechaDevolucion ? new Date(editFechaDevolucion).toISOString() : null,
      });
      setShowEditDialog(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al actualizar");
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
    if (!contenedor) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    let y = 0;

    // Light theme palette
    const PRIMARY: [number, number, number] = [3, 105, 161];
    const DARK: [number, number, number] = [30, 41, 59];
    const GRAY: [number, number, number] = [100, 116, 139];
    const LIGHT: [number, number, number] = [241, 245, 249];

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    // ---- Header band ----
    pdf.setFillColor(...PRIMARY);
    pdf.rect(0, 0, pageW, 26, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("EML Shipping Tracker", margin, 11);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Informe de contenedor ${contenedor.matricula}`, margin, 18);
    pdf.text(`Generado: ${new Date().toLocaleString("es-ES")}`, pageW - margin, 18, { align: "right" });
    y = 34;

    // ---- Section: Datos del contenedor ----
    const sectionTitle = (title: string) => {
      ensureSpace(16);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(...PRIMARY);
      pdf.text(title, margin, y);
      y += 3;
      pdf.setDrawColor(...PRIMARY);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageW - margin, y);
      y += 5;
    };

    const labelValue = (label: string, value: string) => {
      ensureSpace(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...GRAY);
      pdf.text(label, margin, y);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...DARK);
      pdf.text(value, margin + 50, y);
      y += 6;
    };

    sectionTitle("Datos del Contenedor");
    labelValue("Matrícula:", contenedor.matricula);
    labelValue("Cliente:", contenedor.cliente?.nombre || "-");
    labelValue("Tipo ISO:", contenedor.tipo_iso || "-");
    labelValue("Origen:", contenedor.origen || "-");
    labelValue("Destino:", contenedor.destino || "-");
    labelValue("Tara (kg):", contenedor.peso_kg != null ? String(contenedor.peso_kg) : "-");
    labelValue("Mercancía:", contenedor.mercancia || "-");
    labelValue("Mercancía peligrosa:", contenedor.mercancia_peligrosa ? "Sí" : "No");
    labelValue("Alquilado:", contenedor.alquilado ? "Sí" : "No");
    if (contenedor.alquilado) {
      labelValue("Inicio alquiler:", contenedor.fecha_inicio_alquiler ? new Date(contenedor.fecha_inicio_alquiler).toLocaleDateString("es-ES") : "-");
      labelValue("Devolución alquiler:", contenedor.fecha_devolucion_alquiler ? new Date(contenedor.fecha_devolucion_alquiler).toLocaleDateString("es-ES") : "-");
    }
    labelValue("Estado actual:", contenedor.estado?.nombre || "-");
    labelValue("Creado:", new Date(contenedor.created_at).toLocaleString("es-ES"));
    if (tiempoRuta) {
      labelValue("Tiempo en ruta:", `${tiempoRuta.dias} días (${tiempoRuta.horas} horas)`);
    }
    if (contenedor.notas) {
      ensureSpace(8);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...GRAY);
      pdf.text("Notas:", margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...DARK);
      const notaLines = pdf.splitTextToSize(contenedor.notas, contentW);
      pdf.text(notaLines, margin, y);
      y += notaLines.length * 4.5 + 2;
    }
    y += 4;

    // ---- Section: Historial de movimientos ----
    sectionTitle("Historial de Movimientos");
    if (movimientos.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(...GRAY);
      pdf.text("Sin movimientos registrados.", margin, y);
      y += 8;
    } else {
      const colX = [margin, margin + 38, margin + 76, margin + 120];
      const widths = [38, 38, 44, contentW - 120];
      const rowHeight = 5.5;

      // Table header
      pdf.setFillColor(...LIGHT);
      pdf.rect(margin, y - 4, contentW, 5.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...DARK);
      pdf.text("Fecha", colX[0] + 1, y);
      pdf.text("Estado anterior", colX[1] + 1, y);
      pdf.text("Estado nuevo", colX[2] + 1, y);
      pdf.text("Notas", colX[3] + 1, y);
      y += 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      movimientos.forEach((m, i) => {
        const fecha = m.fecha ? new Date(m.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "-";
        const prev = m.estado_anterior?.nombre || "-";
        const next = m.estado_nuevo?.nombre || "-";
        const notas = m.notas || "-";

        const lines = Math.max(
          pdf.splitTextToSize(fecha, widths[0]).length,
          pdf.splitTextToSize(prev, widths[1]).length,
          pdf.splitTextToSize(next, widths[2]).length,
          pdf.splitTextToSize(notas, widths[3]).length
        );
        const h = Math.max(rowHeight, lines * 4 + 1.5);

        if (y + h > pageH - margin) {
          pdf.addPage();
          y = margin;
          pdf.setFillColor(...LIGHT);
          pdf.rect(margin, y - 4, contentW, 5.5, "F");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(...DARK);
          pdf.text("Fecha", colX[0] + 1, y);
          pdf.text("Estado anterior", colX[1] + 1, y);
          pdf.text("Estado nuevo", colX[2] + 1, y);
          pdf.text("Notas", colX[3] + 1, y);
          y += 4;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
        }

        if (i % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y - 3.5, contentW, h, "F");
        }
        pdf.setTextColor(...DARK);
        pdf.text(pdf.splitTextToSize(fecha, widths[0]), colX[0] + 1, y);
        pdf.text(pdf.splitTextToSize(prev, widths[1]), colX[1] + 1, y);
        pdf.text(pdf.splitTextToSize(next, widths[2]), colX[2] + 1, y);
        pdf.text(pdf.splitTextToSize(notas, widths[3]), colX[3] + 1, y);
        y += h + 1;
      });
    }
    y += 4;

    // ---- Section: Mapa de movimientos ----
    const coords = movimientos
      .filter((m): m is Movimiento & { ubicacion_lat: number; ubicacion_lng: number } => !!m.ubicacion_lat && !!m.ubicacion_lng);
    sectionTitle("Mapa de Movimientos");
    let mapDataUrl: string | null = null;
    if (coords.length > 0) {
      mapDataUrl = await captureMapImage(coords);
    }
    if (mapDataUrl) {
      const imgW = contentW;
      const imgH = (imgW * 0.66);
      ensureSpace(imgH + 5);
      try {
        pdf.addImage(mapDataUrl, "JPEG", margin, y, imgW, imgH, undefined, "FAST");
        y += imgH + 5;
      } catch {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(9);
        pdf.setTextColor(...GRAY);
        pdf.text("No se pudo incrustar el mapa en el PDF.", margin, y);
        y += 7;
      }
    } else {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(...GRAY);
      pdf.text(coords.length > 0 ? "No se pudo generar la imagen del mapa." : "Sin ubicaciones registradas.", margin, y);
      y += 7;
    }

    // ---- Footer on every page ----
    const pages = pdf.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      pdf.setPage(p);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...GRAY);
      pdf.text(
        `EML Shipping Tracker — ${contenedor.matricula} — Página ${p} de ${pages}`,
        pageW / 2, pageH - 6, { align: "center" }
      );
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

  const mapMarkers: { id: string | number; lat: number; lng: number; label: string }[] = movimientos
    .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
    .map((m) => ({
      id: m.id,
      lat: m.ubicacion_lat!,
      lng: m.ubicacion_lng!,
      label: `${m.estado_nuevo?.nombre || "Ubicación"} - ${new Date(m.created_at).toLocaleDateString()}`,
    }));

  if (contenedor.origen_lat && contenedor.origen_lng) {
    mapMarkers.unshift({
      id: "origen",
      lat: contenedor.origen_lat,
      lng: contenedor.origen_lng,
      label: `Origen: ${contenedor.origen || ""}`,
    });
  }

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
          <Button variant="outline" size="sm" onClick={() => {
            if (!contenedor) return;
            setEditMatricula(contenedor.matricula);
            setEditClienteId(contenedor.cliente?.id?.toString() || "");
            setEditTipoIso(contenedor.tipo_iso || "");
            setEditOrigen(contenedor.origen || "");
            setEditOrigenLat(contenedor.origen_lat);
            setEditOrigenLng(contenedor.origen_lng);
            setEditDestino(contenedor.destino || "");
            setEditDestinoLat(contenedor.destino_lat);
            setEditDestinoLng(contenedor.destino_lng);
            setEditPeso(contenedor.peso_kg?.toString() || "");
            setEditMercancia(contenedor.mercancia || "");
            setEditNotas(contenedor.notas || "");
            setEditPeligrosa(contenedor.mercancia_peligrosa || false);
            setEditAlquilado(contenedor.alquilado || false);
            setEditFechaInicio(contenedor.fecha_inicio_alquiler ? new Date(contenedor.fecha_inicio_alquiler).toISOString().slice(0, 16) : "");
            setEditFechaDevolucion(contenedor.fecha_devolucion_alquiler ? new Date(contenedor.fecha_devolucion_alquiler).toISOString().slice(0, 16) : "");
            setShowEditDialog(true);
          }}>
            <Pencil className="mr-1 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4 text-destructive" />
            Eliminar
          </Button>
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
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
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
                  <span className="text-muted-foreground">Tara:</span>
                  <span>{contenedor.peso_kg != null ? `${contenedor.peso_kg} kg` : "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Origen:</span>
                  <span>{contenedor.origen || "-"}</span>
                </div>
                {contenedor.destino && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Destino:</span>
                    <span>{contenedor.destino}</span>
                  </div>
                )}
                {contenedor.alquilado && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Calendar className="h-4 w-4" />
                    <span>Alquilado</span>
                    {contenedor.fecha_inicio_alquiler && (
                      <span className="text-xs text-muted-foreground ml-2">
                        Inicio: {new Date(contenedor.fecha_inicio_alquiler).toLocaleDateString()}
                      </span>
                    )}
                    {contenedor.fecha_devolucion_alquiler && (
                      <span className="text-xs text-muted-foreground ml-1">
                        — Devolución: {new Date(contenedor.fecha_devolucion_alquiler).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
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
            <div className="flex-1 rounded-lg border overflow-hidden isolate relative z-0">
              <OpenStreetMap
                lat={contenedor.ubicacion_lat}
                lng={contenedor.ubicacion_lng}
                markers={mapMarkers}
                center={mapCenter}
                zoom={6}
                onLocationSelect={handleMapClick}
                onMarkerClick={(id) => {
                  setFocusedLocationId(id as number);
                  setTimeout(() => setFocusedLocationId(null), 3000);
                }}
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
                    <div
                      key={mov.id}
                      id={`loc-${mov.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2 text-xs transition-colors",
                        focusedLocationId === mov.id && "border-primary bg-primary/5 ring-1 ring-primary"
                      )}
                    >  <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
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

        <TabsContent value="fotos">
          <AdjuntosTab contenedorId={contenedor.id} tipo="photo" />
        </TabsContent>

        <TabsContent value="documentos">
          <AdjuntosTab contenedorId={contenedor.id} tipo="document" />
        </TabsContent>
      </Tabs>

      {showEditDialog && contenedor && (
        <Dialog open onOpenChange={() => setShowEditDialog(false)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Contenedor</DialogTitle>
              <DialogDescription>{contenedor.matricula}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Matrícula *</Label>
                <Input value={editMatricula} onChange={(e) => setEditMatricula(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input value={editClienteId} onChange={(e) => setEditClienteId(e.target.value)} placeholder="ID del cliente" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo ISO</Label>
                  <Input value={editTipoIso} onChange={(e) => setEditTipoIso(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Origen</Label><LocationInput value={editOrigen} onChange={(v, lat, lng) => {
                  setEditOrigen(v);
                  if (lat != null && lng != null) {
                    setEditOrigenLat(lat);
                    setEditOrigenLng(lng);
                  }
                }} placeholder="Buscar origen..." /></div>
                <div className="space-y-2"><Label>Destino</Label><LocationInput
                  value={editDestino}
                  onChange={(v, lat, lng) => {
                    setEditDestino(v);
                    if (lat != null && lng != null) {
                      setEditDestinoLat(lat);
                      setEditDestinoLng(lng);
                    }
                  }}
                  placeholder="Buscar destino..."
                /></div>
              </div>
              <div className="space-y-2"><Label>Tara (KG)</Label><Input type="number" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} /></div>
              <div className="space-y-2"><Label>Mercancía</Label><Input value={editMercancia} onChange={(e) => setEditMercancia(e.target.value)} /></div>
              <div className="space-y-2"><Label>Notas</Label><Input value={editNotas} onChange={(e) => setEditNotas(e.target.value)} /></div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="cursor-pointer">Mercancía peligrosa</Label>
                <Switch checked={editPeligrosa} onCheckedChange={setEditPeligrosa} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label className="cursor-pointer">Alquilado</Label>
                <Switch checked={editAlquilado} onCheckedChange={setEditAlquilado} />
              </div>
              {editAlquilado && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Inicio alquiler</Label><Input type="datetime-local" value={editFechaInicio} onChange={(e) => setEditFechaInicio(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Devolución alquiler</Label><Input type="datetime-local" value={editFechaDevolucion} onChange={(e) => setEditFechaDevolucion(e.target.value)} /></div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
  const [lat, setLat] = useState<number | undefined>(movimiento?.ubicacion_lat);
  const [lng, setLng] = useState<number | undefined>(movimiento?.ubicacion_lng);
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
    if (lat == null || lng == null) {
      alert("Selecciona una ubicación en el mapa");
      return;
    }
    setLoading(true);
    try {
      await onSave(
        movimiento?.id || 0,
        lat,
        lng,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{movimiento ? "Editar Ubicación" : "Nueva Ubicación"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="h-64 rounded-md overflow-hidden border isolate relative z-0">
            <OpenStreetMap
              lat={lat}
              lng={lng}
              onLocationSelect={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>
          {lat != null && lng != null && (
            <p className="text-xs text-muted-foreground">
              Ubicación: {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          )}
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
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

function AdjuntosTab({ contenedorId, tipo }: { contenedorId: number; tipo: "photo" | "document" }) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAdjuntos = () => {
    api.get(`/contenedores/${contenedorId}/adjuntos`).then((res) => setAdjuntos(res.data));
  };

  useEffect(() => { fetchAdjuntos(); }, [contenedorId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo no puede superar 5 MB");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        await api.post(`/contenedores/${contenedorId}/adjuntos`, {
          tipo,
          nombre: file.name,
          filename: file.name,
          data: dataUrl,
        });
        fetchAdjuntos();
      } catch { alert("Error al subir archivo"); }
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (adjId: number) => {
    if (!confirm("¿Eliminar este adjunto?")) return;
    await api.delete(`/contenedores/${contenedorId}/adjuntos/${adjId}`);
    fetchAdjuntos();
  };

  const items = adjuntos.filter((a) => a.tipo === tipo);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Subiendo..." : tipo === "photo" ? (
              <><Camera className="mr-1 h-4 w-4" /> Subir Foto</>
            ) : (
              <><Paperclip className="mr-1 h-4 w-4" /> Subir Documento</>
            )}
          </Button>
          <input ref={fileRef} type="file" className="hidden" accept={tipo === "photo" ? "image/*" : ".pdf,.doc,.docx,.xls,.xlsx,.txt"} onChange={handleFileUpload} />
        </div>

        {items.length > 0 ? (
          tipo === "photo" ? (
            <div>
              <h3 className="text-sm font-semibold mb-3">Fotos ({items.length})</h3>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((p) => (
                  <div key={p.id} className="relative group rounded-lg border overflow-hidden">
                    <img src={p.data} alt={p.nombre} className="w-full h-32 object-cover" />
                    <button
                      className="absolute top-1 right-1 p-1 rounded bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <p className="p-1 text-[10px] text-muted-foreground truncate">{p.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-semibold mb-3">Documentos ({items.length})</h3>
              <div className="space-y-1">
                {items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{d.nombre}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a href={d.data} download={d.nombre} className="text-xs text-primary hover:underline p-1">Descargar</a>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin {tipo === "photo" ? "fotos" : "documentos"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface Adjunto {
  id: number;
  tipo: string;
  nombre: string;
  filename: string;
  data: string;
  created_at: string;
}
