import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "@/lib/api";
import { usePageControls } from "@/contexts/PageControlsContext";
import { ContainerGlobe } from "@/components/globe/ContainerGlobe";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Contenedor {
  id: number;
  matricula: string;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  destino?: string;
  destino_lat?: number;
  destino_lng?: number;
  estado?: { nombre: string } | null;
}

interface Movimiento {
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  estado_nuevo?: { nombre: string } | null;
  created_at: string;
}

export default function AdminGlobe() {
  const { setLeftContent } = usePageControls();

  useEffect(() => {
    setLeftContent(<h1 className="text-lg font-bold">Globo 3D</h1>);
    return () => setLeftContent(null);
  }, [setLeftContent]);

  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [selectedId, setSelectedId] = useState<string>("all");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [allMovimientos, setAllMovimientos] = useState<Record<number, Movimiento[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    api
      .get("/contenedores")
      .then((res) => setContenedores(res.data))
      .catch((err) => console.error("Error fetching contenedores:", err));
  }, []);

  useEffect(() => {
    if (selectedId === "all") {
      setMovimientos([]);
      return;
    }
    api
      .get(`/contenedores/${selectedId}/movimientos`)
      .then((res) => setMovimientos(res.data))
      .catch((err) => console.error("Error fetching movimientos:", err));
  }, [selectedId]);

  useEffect(() => {
    if (selectedId !== "all") return;
    let cancelled = false;
    Promise.all(
      contenedores.map((c) =>
        api.get(`/contenedores/${c.id}/movimientos`).then((res) => res.data)
      )
    )
      .then((all) => {
        if (cancelled) return;
        const map: Record<number, Movimiento[]> = {};
        contenedores.forEach((c, i) => {
          map[c.id] = all[i] || [];
        });
        setAllMovimientos(map);
      })
      .catch((err) => console.error("Error fetching all movimientos:", err));
    return () => {
      cancelled = true;
    };
  }, [selectedId, contenedores]);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      setSize({ width: w, height: h });
    }
  }, []);

  useEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [measure]);

  const points = useMemo(() => {
    if (selectedId === "all") {
      return contenedores
        .filter((c) => c.ubicacion_lat && c.ubicacion_lng)
        .map((c) => ({
          lat: c.ubicacion_lat!,
          lng: c.ubicacion_lng!,
          label: `${c.matricula} (${c.estado?.nombre || ""})`,
        }));
    }
    const cont = contenedores.find((c) => c.id.toString() === selectedId);
    if (cont?.ubicacion_lat && cont?.ubicacion_lng) {
      return [
        {
          lat: cont.ubicacion_lat,
          lng: cont.ubicacion_lng,
          label: cont.matricula,
          color: "#f59e0b",
        },
      ];
    }
    return [];
  }, [contenedores, selectedId]);

  const destinationPoints = useMemo(() => {
    if (selectedId === "all") {
      return contenedores
        .filter((c) => c.destino_lat && c.destino_lng)
        .map((c) => ({
          lat: c.destino_lat!,
          lng: c.destino_lng!,
          label: `Destino ${c.destino || ""}`.trim() || c.matricula,
          color: "#22c55e",
        }));
    }
    const cont = contenedores.find((c) => c.id.toString() === selectedId);
    if (cont?.destino_lat && cont?.destino_lng) {
      return [{
        lat: cont.destino_lat,
        lng: cont.destino_lng,
        label: `Destino ${cont.destino || ""}`.trim(),
        color: "#22c55e",
      }];
    }
    return [];
  }, [contenedores, selectedId]);

  const routes = useMemo(() => {
    if (selectedId === "all") {
      const allRoutes: { startLat: number; startLng: number; endLat: number; endLng: number }[] = [];
      contenedores.forEach((c) => {
        const movs = allMovimientos[c.id] || [];
        const locations = movs
          .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
          .map((m) => ({
            lat: m.ubicacion_lat!,
            lng: m.ubicacion_lng!,
          }));
        if (c.ubicacion_lat && c.ubicacion_lng) {
          locations.push({ lat: c.ubicacion_lat, lng: c.ubicacion_lng });
        }
        for (let i = 0; i < locations.length - 1; i++) {
          allRoutes.push({
            startLat: locations[i].lat,
            startLng: locations[i].lng,
            endLat: locations[i + 1].lat,
            endLng: locations[i + 1].lng,
          });
        }
      });
      return allRoutes;
    }

    const locations = movimientos
      .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
      .map((m) => ({
        lat: m.ubicacion_lat!,
        lng: m.ubicacion_lng!,
      }));
    if (locations.length < 2) return [];
    const routePaths: { startLat: number; startLng: number; endLat: number; endLng: number }[] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      routePaths.push({
        startLat: locations[i].lat,
        startLng: locations[i].lng,
        endLat: locations[i + 1].lat,
        endLng: locations[i + 1].lng,
      });
    }
    return routePaths;
  }, [movimientos, allMovimientos, contenedores, selectedId]);

  const focusOn = useMemo(() => {
    if (selectedId === "all") return null;
    return points.length > 0 ? points[0] : null;
  }, [points, selectedId]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={containerRef} className="h-full w-full">
        {size.width > 0 && size.height > 0 ? (
          <ContainerGlobe
            points={[...points, ...destinationPoints]}
            routes={routes}
            focusOn={focusOn}
            width={size.width}
            height={size.height}
            animatedArcs={selectedId === "all"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50">
            <span className="text-sm text-muted-foreground">Cargando globo...</span>
          </div>
        )}
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-3 rounded-lg border bg-card/90 backdrop-blur px-4 py-2 shadow-lg">
        <Label className="text-sm whitespace-nowrap">Ver:</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-56">
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
      </div>

      {selectedId !== "all" && destinationPoints.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-lg border bg-card/90 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          Destino
        </div>
      )}
    </div>
  );
}
