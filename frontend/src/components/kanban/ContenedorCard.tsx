import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Ship, AlertTriangle, Weight, MapPin } from "lucide-react";

interface Contenedor {
  id: number;
  matricula: string;
  estado_id: number;
  cliente?: { nombre: string } | null;
  tipo_iso?: string;
  destino?: string;
  mercancia_peligrosa: boolean;
  peso_kg?: number;
}

export function ContenedorCard({
  contenedor,
  disableClick,
  isGroupTarget = false,
}: {
  contenedor: Contenedor;
  disableClick?: boolean;
  isGroupTarget?: boolean;
}) {
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contenedor.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "relative cursor-grab active:cursor-grabbing touch-none rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md select-none",
        isDragging && "opacity-50",
        isGroupTarget && "border-primary ring-2 ring-primary bg-primary/5",
        contenedor.mercancia_peligrosa && "border-orange-500"
      )}
      style={style}
      onClick={() => { if (!disableClick) navigate(`/contenedores/${contenedor.id}`); }}
    >
      {contenedor.mercancia_peligrosa && (
        <div
          className="absolute inset-0 rounded-md opacity-20"
          style={{
            background: "repeating-linear-gradient(45deg, #eab308, #eab308 6px, #f97316 6px, #f97316 12px)",
          }}
        />
      )}
      {isGroupTarget && !isDragging && (
        <div className="absolute inset-x-2 bottom-2 z-20 rounded bg-primary px-2 py-1 text-center text-[11px] font-semibold text-primary-foreground shadow">
          Soltar para agrupar
        </div>
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
        {contenedor.destino && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {contenedor.destino}
          </p>
        )}
      </div>
    </div>
  );
}
