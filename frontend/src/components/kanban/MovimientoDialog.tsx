import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpenStreetMap } from "@/components/map/OpenStreetMap";
import { AlertTriangle } from "lucide-react";

interface Contenedor {
  id: number;
  matricula: string;
}

interface Props {
  contenedor: Contenedor;
  targetEstado: string;
  onConfirm: (lat?: number, lng?: number, notas?: string, fecha?: string) => void;
  onCancel: () => void;
  isDelete?: boolean;
}

export function MovimientoDialog({ contenedor, targetEstado, onConfirm, onCancel, isDelete = false }: Props) {
  const [notas, setNotas] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [fecha, setFecha] = useState("");
  const [showMap, setShowMap] = useState(false);

  if (isDelete) {
    return (
      <Dialog open onOpenChange={onCancel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar Contenedor
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>{contenedor.matricula}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => onConfirm()}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mover Contenedor</DialogTitle>
          <DialogDescription>
            {contenedor.matricula} → <strong>{targetEstado}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Notas del movimiento</Label>
            <Input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Opcional: información del movimiento"
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha del movimiento</Label>
            <Input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ubicación</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowMap(!showMap)}>
                {showMap ? "Ocultar mapa" : "Seleccionar en mapa"}
              </Button>
            </div>
            {showMap && (
              <div className="h-64 rounded-md overflow-hidden border">
                <OpenStreetMap
                  lat={lat}
                  lng={lng}
                  onLocationSelect={(newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                  }}
                />
              </div>
            )}
            {lat != null && lng != null && (
              <p className="text-xs text-muted-foreground">
                Ubicación: {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(lat, lng, notas, fecha ? new Date(fecha).toISOString() : undefined)}>
            Confirmar movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
