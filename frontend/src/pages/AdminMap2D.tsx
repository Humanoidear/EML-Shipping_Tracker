import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { OpenStreetMap } from "@/components/map/OpenStreetMap";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Contenedor {
  id: number;
  matricula: string;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  destino?: string;
  estado?: { nombre: string } | null;
}

interface Movimiento {
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  estado_nuevo?: { nombre: string } | null;
  created_at: string;
}

export function AdminMap2D() {
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [selectedId, setSelectedId] = useState<string>("all");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  useEffect(() => {
    api.get("/contenedores").then((res) => setContenedores(res.data));
  }, []);

  useEffect(() => {
    if (selectedId === "all") {
      setMovimientos([]);
      return;
    }
    api.get(`/contenedores/${selectedId}/movimientos`).then((res) => setMovimientos(res.data));
  }, [selectedId]);

  const markers = useMemo(() => {
    if (selectedId === "all") {
      return contenedores
        .filter((c) => c.ubicacion_lat && c.ubicacion_lng)
        .map((c) => ({
          id: c.id,
          lat: c.ubicacion_lat!,
          lng: c.ubicacion_lng!,
          label: `${c.matricula} (${c.estado?.nombre || ""})${c.destino ? ` → ${c.destino}` : ""}`,
        }));
    }
    const cont = contenedores.find((c) => c.id.toString() === selectedId);
    if (cont?.ubicacion_lat && cont?.ubicacion_lng) {
      return [{
        id: cont.id,
        lat: cont.ubicacion_lat,
        lng: cont.ubicacion_lng,
        label: `${cont.matricula} (${cont.estado?.nombre || ""})`,
      }];
    }
    return [];
  }, [contenedores, selectedId]);

  const routeMarkers = useMemo(() => {
    if (selectedId === "all") return [];
    return movimientos
      .filter((m): m is Movimiento & { ubicacion_lat: number; ubicacion_lng: number } => !!m.ubicacion_lat && !!m.ubicacion_lng)
      .map((m) => ({
        id: m.created_at,
        lat: m.ubicacion_lat,
        lng: m.ubicacion_lng,
        label: `${m.estado_nuevo?.nombre || "Ubicación"} - ${new Date(m.created_at).toLocaleDateString()}`,
      }));
  }, [movimientos, selectedId]);

  const routeCoords: [number, number][] = useMemo(() => {
    if (selectedId === "all") return [];
    const coords = routeMarkers.map((m) => [m.lat, m.lng] as [number, number]);
    const cont = contenedores.find((c) => c.id.toString() === selectedId);
    if (cont?.ubicacion_lat && cont?.ubicacion_lng) {
      coords.push([cont.ubicacion_lat, cont.ubicacion_lng]);
    }
    return coords;
  }, [routeMarkers, contenedores, selectedId]);

  const center: [number, number] | undefined = useMemo(() => {
    if (markers.length > 0) return [markers[0].lat, markers[0].lng];
    return undefined;
  }, [markers]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Label>Ver:</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los contenedores</SelectItem>
            {contenedores.map((c) => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {c.matricula}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {selectedId === "all"
            ? `${markers.length} contenedores con ubicación`
            : `${routeMarkers.length} puntos en la ruta`}
        </span>
      </div>
      <div className="h-[420px] rounded-lg border overflow-hidden isolate relative z-0">
        <OpenStreetMap
          lat={markers[0]?.lat}
          lng={markers[0]?.lng}
          markers={selectedId === "all" ? markers : [...routeMarkers, ...markers]}
          route={selectedId === "all" ? undefined : routeCoords}
          center={center}
          zoom={4}
        />
      </div>
    </div>
  );
}
