import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl";

interface ContainerPoint {
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

interface RoutePath {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string;
}

interface Props {
  points: ContainerPoint[];
  routes?: RoutePath[];
  focusOn?: ContainerPoint | null;
  width: number;
  height: number;
  animatedArcs?: boolean;
  highlightRoutes?: RoutePath[];
}

export function ContainerGlobe({ points, routes = [], focusOn, width, height, animatedArcs = false, highlightRoutes = [] }: Props) {
  const globeEl = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<ContainerPoint | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!globeEl.current || !ready) return;
    if (globeEl.current.controls) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.4;
    }
    if (focusOn) {
      // If we have a highlighted route, zoom out to fit its full extent.
      if (highlightRoutes.length > 0) {
        const lats = highlightRoutes.flatMap((r) => [r.startLat, r.endLat]);
        const lngs = highlightRoutes.flatMap((r) => [r.startLng, r.endLng]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const latSpan = maxLat - minLat;
        const lngSpan = maxLng - minLng;
        const span = Math.max(latSpan, lngSpan * Math.cos((centerLat * Math.PI) / 180));
        // Rough heuristic: bigger span -> higher altitude. Local routes ~1.8, intercontinental ~3.
        const altitude = Math.min(3.2, 1.8 + span / 60);
        globeEl.current.pointOfView({ lat: centerLat, lng: centerLng, altitude }, 1000);
      } else {
        globeEl.current.pointOfView({ lat: focusOn.lat, lng: focusOn.lng, altitude: 1.5 }, 1000);
      }
    } else {
      globeEl.current.pointOfView({ lat: 30, lng: 0, altitude: 2.5 }, 1000);
    }
  }, [focusOn, highlightRoutes, ready]);

  const htmlElements = useMemo(() => {
    if (!hoveredPoint) return [];
    return [{
      lat: hoveredPoint.lat,
      lng: hoveredPoint.lng,
      data: hoveredPoint,
    }];
  }, [hoveredPoint]);

  if (!ready || !width || !height) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 rounded-lg">
        <span className="text-sm text-muted-foreground">Cargando globo...</span>
      </div>
    );
  }

  return (
    <Globe
      ref={globeEl}
      width={width}
      height={height}
      {...({
        globeImageUrl: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
        showGraticules: true,
        pointsData: points,
        pointLat: "lat",
        pointLng: "lng",
        pointColor: (d: any) => d.color || "#f59e0b",
        pointAltitude: 0.02,
        pointRadius: 0.45,
        onPointHover: (d: ContainerPoint | null) => setHoveredPoint(d),
        htmlElementsData: htmlElements,
        htmlLat: "lat",
        htmlLng: "lng",
        htmlElement: (d: any) => {
          const el = document.createElement("div");
          el.innerHTML = `
            <div style="
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 12px;
              color: #1e293b;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              white-space: nowrap;
              pointer-events: none;
              transform: translate(-50%, -120%);
            ">
              <div style="font-weight: 600;">${d.data?.label || d.label || ""}</div>
            </div>
          `;
          return el;
        },
        arcsData: [...routes, ...highlightRoutes.map((r) => ({ ...r, highlighted: true }))],
        arcStartLat: "startLat",
        arcStartLng: "startLng",
        arcEndLat: "endLat",
        arcEndLng: "endLng",
        arcColor: (d: any) => (d.highlighted ? "#2563eb" : (animatedArcs ? "rgba(59, 130, 246, 0.35)" : (d.color || "#3b82f6"))),
        arcAltitude: 0.2,
        arcStroke: (d: any) => (d.highlighted ? 1.2 : (animatedArcs ? 0.6 : 1)),
        arcDashLength: (d: any) => (d.highlighted ? 0 : (animatedArcs ? 0.3 : 0)),
        arcDashGap: (d: any) => (d.highlighted ? 0 : (animatedArcs ? 3 : 0)),
        arcDashAnimateTime: (d: any) => (d.highlighted ? 0 : (animatedArcs ? 2500 : 0)),
        arcOpacity: (d: any) => (d.highlighted ? 1 : (animatedArcs ? 0.4 : 0.9)),
        atmosphereColor: "#bfdbfe",
        backgroundColor: "rgba(0,0,0,0)",
        cloudsImgUrl: "https://unpkg.com/three-globe/example/img/earth-clouds.png",
        cloudsAltitude: 0.004,
        cloudsOpacity: 0.35,
      } as any)}
    />
  );
}
