import { useEffect, useRef, useState } from "react";
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
}

export function ContainerGlobe({ points, routes = [], focusOn, width, height }: Props) {
  const globeEl = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!globeEl.current || !ready) return;
    if (focusOn) {
      globeEl.current.pointOfView({ lat: focusOn.lat, lng: focusOn.lng, altitude: 1.5 }, 1000);
    } else {
      globeEl.current.pointOfView({ lat: 30, lng: 0, altitude: 2.5 }, 1000);
    }
  }, [focusOn, ready]);

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
      globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      showGraticules={true}
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointColor={(d: any) => d.color || "#f59e0b"}
      pointAltitude={0.015}
      pointRadius={0.35}
      pointLabel="label"
      arcsData={routes}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor={(d: any) => d.color || "#3b82f6"}
      arcAltitude={0.2}
      arcStroke={1.5}
      arcDashGap={2}
      atmosphereColor="#bfdbfe"
      backgroundColor="rgba(0,0,0,0)"
    />
  );
}
