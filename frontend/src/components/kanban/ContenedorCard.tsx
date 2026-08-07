import { Draggable } from "@hello-pangea/dnd";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Ship, AlertTriangle, Weight } from "lucide-react";

interface Contenedor {
  id: number;
  matricula: string;
  estado_id: number;
  cliente?: { nombre: string } | null;
  tipo_iso?: string;
  mercancia_peligrosa: boolean;
  peso_kg?: number;
}

export function ContenedorCard({ contenedor, index, disableClick }: { contenedor: Contenedor; index: number; disableClick?: boolean }) {
  const navigate = useNavigate();

  return (
    <Draggable draggableId={contenedor.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => { if (!disableClick) navigate(`/contenedores/${contenedor.id}`); }}
          className={cn(
            "relative cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary",
            snapshot.combineTargetFor && "ring-2 ring-primary/50 bg-primary/5",
            contenedor.mercancia_peligrosa && "border-orange-500"
          )}
        >
          {contenedor.mercancia_peligrosa && (
            <div
              className="absolute inset-0 rounded-md opacity-20"
              style={{
                background: "repeating-linear-gradient(45deg, #eab308, #eab308 6px, #f97316 6px, #f97316 12px)",
              }}
            />
          )}
          <div className="relative space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-sm font-bold">{contenedor.matricula}</span>
              </div>
              {contenedor.mercancia_peligrosa && (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
            {contenedor.cliente && (
              <p className="text-xs text-muted-foreground">{contenedor.cliente.nombre}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {contenedor.tipo_iso && <span>{contenedor.tipo_iso}</span>}
              {contenedor.peso_kg != null && (
                <span className="flex items-center gap-0.5">
                  <Weight className="h-3 w-3" />
                  {contenedor.peso_kg} kg
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
