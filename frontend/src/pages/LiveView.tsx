import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import api from "@/lib/api";
import { ContainerGlobe } from "@/components/globe/ContainerGlobe";
import logoSvg from "/img/logo.svg";
import { cn } from "@/lib/utils";
import { Ship, AlertTriangle, Weight, MapPin, User } from "lucide-react";

interface Contenedor {
  id: number;
  matricula: string;
  cliente?: { nombre: string } | null;
  tipo_iso?: string;
  destino?: string;
  peso_kg?: number;
  mercancia_peligrosa: boolean;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  estado?: { nombre: string; color?: string } | null;
}

interface Movimiento {
  id: number;
  contenedor_id: number;
  estado_anterior?: { nombre: string } | null;
  estado_nuevo?: { nombre: string } | null;
  ubicacion_lat?: number;
  ubicacion_lng?: number;
  notas?: string;
  username?: string;
  fecha?: string;
  created_at: string;
}

interface ActivityItem {
  key: number;
  matricula: string;
  prev: string;
  next: string;
  user: string;
  when: Date;
  visible: boolean;
}

const FEED_SIZE = 6;

export default function LiveView() {
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [allMovimientos, setAllMovimientos] = useState<Record<number, Movimiento[]>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [featured, setFeatured] = useState<Contenedor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const seenIds = useRef<Set<number>>(new Set());
  const [clock, setClock] = useState(new Date());

  const matriculaMap = useMemo(() => {
    const map = new Map<number, string>();
    contenedores.forEach((c) => map.set(c.id, c.matricula));
    return map;
  }, [contenedores]);

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
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [measure]);

  // Poll containers + movement history for real-time map/count updates.
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        const contRes = await api.get("/contenedores");
        const conts: Contenedor[] = contRes.data;
        if (cancelled) return;
        setContenedores(conts);
        const movs = await Promise.all(
          conts.map((c) => api.get(`/contenedores/${c.id}/movimientos`).then((r) => r.data))
        );
        if (cancelled) return;
        const map: Record<number, Movimiento[]> = {};
        conts.forEach((c, i) => { map[c.id] = movs[i] || []; });
        setAllMovimientos(map);
      } catch {
        // ignore
      }
    };
    loadAll();
    const interval = window.setInterval(loadAll, 10000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, []);

  // Poll activity feed.
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get("/reportes/actividad");
        const movs: Movimiento[] = res.data || [];
        movs.forEach((m) => {
          if (seenIds.current.has(m.id)) return;
          seenIds.current.add(m.id);
          const when = m.fecha ? new Date(m.fecha) : new Date(m.created_at);
          setActivity((prev) => [
            {
              key: m.id,
              matricula: matriculaMap.get(m.contenedor_id) || `#${m.contenedor_id}`,
              prev: m.estado_anterior?.nombre || "",
              next: m.estado_nuevo?.nombre || "Movimiento",
              user: m.username || "Sistema",
              when,
              visible: true,
            },
            ...prev,
          ].slice(0, FEED_SIZE));
        });
      } catch {
        // ignore
      }
    };
    poll();
    const interval = window.setInterval(poll, 5000);
    return () => window.clearInterval(interval);
  }, [matriculaMap]);

  // Clock updates every second.
  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Fade out old feed items.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setActivity((prev) => prev.map((a) => ({ ...a, visible: false })));
    }, 12000);
    return () => window.clearTimeout(t);
  }, [activity.length]);

  // Every 5 seconds pick a random container with a location and focus it.
  useEffect(() => {
    const pick = () => {
      const withLocation = contenedores.filter((c) => c.ubicacion_lat && c.ubicacion_lng);
      if (withLocation.length === 0) return;
      const chosen = withLocation[Math.floor(Math.random() * withLocation.length)];
      setFeatured(chosen);
    };
    pick();
    const interval = window.setInterval(pick, 5000);
    return () => window.clearInterval(interval);
  }, [contenedores]);

  const points = useMemo(() => {
    return contenedores
      .filter((c) => c.ubicacion_lat && c.ubicacion_lng)
      .map((c) => ({
        lat: c.ubicacion_lat!,
        lng: c.ubicacion_lng!,
        label: `${c.matricula} (${c.estado?.nombre || ""})`,
      }));
  }, [contenedores]);

  const routes = useMemo(() => {
    const allRoutes: { startLat: number; startLng: number; endLat: number; endLng: number }[] = [];
    contenedores.forEach((c) => {
      const movs = allMovimientos[c.id] || [];
      const locations = movs
        .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
        .map((m) => ({ lat: m.ubicacion_lat!, lng: m.ubicacion_lng! }));
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
  }, [contenedores, allMovimientos]);

  const focusOn = useMemo(() => {
    if (!featured?.ubicacion_lat || !featured?.ubicacion_lng) return null;
    return {
      lat: featured.ubicacion_lat,
      lng: featured.ubicacion_lng,
      label: featured.matricula,
    };
  }, [featured]);

  const highlightRoutes = useMemo(() => {
    if (!featured) return [];
    const movs = allMovimientos[featured.id] || [];
    const locations = movs
      .filter((m) => m.ubicacion_lat && m.ubicacion_lng)
      .map((m) => ({ lat: m.ubicacion_lat!, lng: m.ubicacion_lng! }));
    if (featured.ubicacion_lat && featured.ubicacion_lng) {
      locations.push({ lat: featured.ubicacion_lat, lng: featured.ubicacion_lng });
    }
    const segs: { startLat: number; startLng: number; endLat: number; endLng: number }[] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      segs.push({
        startLat: locations[i].lat,
        startLng: locations[i].lng,
        endLat: locations[i + 1].lat,
        endLng: locations[i + 1].lng,
      });
    }
    return segs;
  }, [featured, allMovimientos]);

  const totalMovimientos = useMemo(() => {
    return Object.values(allMovimientos).reduce((s, movs) => s + movs.length, 0);
  }, [allMovimientos]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={containerRef} className="absolute inset-0">
        {size.width > 0 && size.height > 0 && (
          <ContainerGlobe
            points={points}
            routes={routes}
            focusOn={focusOn}
            highlightRoutes={highlightRoutes}
            width={size.width}
            height={size.height}
            animatedArcs
          />
        )}
      </div>

      {/* Top-left brand */}
      <div className="absolute top-6 left-8 z-10 flex items-center gap-3 select-none">
        <img src={logoSvg} alt="EML" className={cn("h-10 w-10 opacity-90 invert-on-dark")} />
        <div>
          <p className="text-lg font-bold tracking-wide text-foreground leading-none">EML Shipping Tracker</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Vista en vivo</p>
        </div>
      </div>

      {/* Top-right clock */}
      <div className="absolute top-6 right-8 z-10 text-right select-none">
        <p className="text-3xl font-light text-foreground tabular-nums leading-none">
          {clock.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {clock.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Bottom-left featured container card (kanban style) */}
      <div className="absolute bottom-6 left-8 z-10 w-[340px] select-none">
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Contenedor en foco
        </p>
        {featured ? (
          <div
            className={cn(
              "relative rounded-md border bg-card p-3 shadow-lg",
              featured.mercancia_peligrosa && "border-orange-500"
            )}
          >
            {featured.mercancia_peligrosa && (
              <div
                className="absolute inset-0 rounded-md opacity-20"
                style={{
                  background: "repeating-linear-gradient(45deg, #eab308, #eab308 6px, #f97316 6px, #f97316 12px)",
                }}
              />
            )}
            <div className="relative space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Ship className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-base font-bold">{featured.matricula}</span>
                </div>
                {featured.mercancia_peligrosa && <AlertTriangle className="h-4 w-4 text-orange-500" />}
              </div>
              {featured.cliente && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" /> {featured.cliente.nombre}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {featured.tipo_iso && <span>{featured.tipo_iso}</span>}
                {featured.peso_kg != null && (
                  <span className="flex items-center gap-0.5">
                    <Weight className="h-3 w-3" /> {featured.peso_kg} kg
                  </span>
                )}
                {featured.destino && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {featured.destino}
                  </span>
                )}
              </div>
              {featured.estado && (
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: featured.estado.color || "#3b82f6" }}
                >
                  {featured.estado.nombre}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
            Esperando contenedores…
          </div>
        )}
      </div>

      {/* Bottom-right activity feed + status */}
      <div className="absolute bottom-6 right-8 z-10 flex w-[380px] flex-col items-end gap-4 select-none">
        <div className="flex flex-col items-end space-y-2">
          {activity.length === 0 && (
            <p className="text-sm text-muted-foreground">Esperando actividad…</p>
          )}
          {activity.map((a) => (
            <div
              key={a.key}
              className={cn(
                "w-full rounded-lg border bg-card/80 px-4 py-2.5 backdrop-blur-md transition-all duration-1000",
                a.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                <span className="font-mono text-sm font-semibold text-foreground">{a.matricula}</span>
                <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                  {a.when.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                {a.prev && <span>{a.prev}</span>}
                {a.prev && <span>→</span>}
                <span className="font-medium text-foreground">{a.next}</span>
                <span className="ml-auto">por {a.user}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {contenedores.length} contenedores · {totalMovimientos} movimientos
        </p>
      </div>
    </div>
  );
}
