import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MarkerData {
  id?: string | number;
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  lat?: number;
  lng?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  onMarkerDrag?: (id: string | number | undefined, lat: number, lng: number) => void;
  onMarkerClick?: (id: string | number | undefined) => void;
  markers?: MarkerData[];
  route?: [number, number][];
  center?: [number, number];
  zoom?: number;
  focusLat?: number;
  focusLng?: number;
}

export function OpenStreetMap({
  lat, lng, onLocationSelect, onMarkerDrag, onMarkerClick, markers = [],
  route, center, zoom = 13, focusLat, focusLng,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyLayerRef = useRef<L.LayerGroup | null>(null);
  const selectionLayerRef = useRef<L.LayerGroup | null>(null);
  const focusMarkerRef = useRef<L.Marker | null>(null);

  const defaultCenter: [number, number] = lat && lng ? [lat, lng] : [41.3874, 2.1686];

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center || defaultCenter, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    historyLayerRef.current = L.layerGroup().addTo(map);
    selectionLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      selectionLayerRef.current?.clearLayers();
      L.marker([lat, lng])
        .addTo(selectionLayerRef.current!)
        .bindPopup(`${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        .openPopup();
      onLocationSelect?.(lat, lng);
    });

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (focusLat != null && focusLng != null) {
      mapRef.current.setView([focusLat, focusLng], mapRef.current.getZoom(), { animate: true });

      if (focusMarkerRef.current) {
        focusMarkerRef.current.remove();
      }
      const icon = new L.Icon({
        iconUrl: markerIcon,
        iconRetinaUrl: markerIcon2x,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: "focus-marker",
      });
      const fm = L.marker([focusLat, focusLng], { icon, zIndexOffset: 1000 })
        .addTo(mapRef.current)
        .bindPopup(`${focusLat.toFixed(6)}, ${focusLng.toFixed(6)}`);
      focusMarkerRef.current = fm;
    }
  }, [focusLat, focusLng]);

  useEffect(() => {
    if (!historyLayerRef.current) return;
    historyLayerRef.current.clearLayers();

    if (route && route.length >= 2) {
      L.polyline(route, { color: "#3b82f6", weight: 3, opacity: 0.8, dashArray: "6, 4" })
        .addTo(historyLayerRef.current);
    }

    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { draggable: !!onMarkerDrag })
        .addTo(historyLayerRef.current!)
        .bindPopup(m.label);

      if (onMarkerDrag) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onMarkerDrag(m.id, pos.lat, pos.lng);
        });
      }

      if (onMarkerClick) {
        marker.on("click", () => {
          onMarkerClick(m.id);
        });
      }
    });
  }, [markers, onMarkerDrag, route]);

  useEffect(() => {
    if (lat && lng && selectionLayerRef.current) {
      selectionLayerRef.current.clearLayers();
      L.marker([lat, lng])
        .addTo(selectionLayerRef.current!)
        .bindPopup(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="h-full w-full" />;
}
