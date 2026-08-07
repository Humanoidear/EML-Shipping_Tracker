import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Ship, AlertTriangle, Layers, X } from "lucide-react";

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

interface Grupo {
  id: number;
  nombre: string;
  estado_id: number;
  contenedores: Contenedor[];
}

const MAX_VISIBLE = 4;

export function GrupoCard({
  grupo,
  onRemoveContainer,
  onClickOverride,
}: {
  grupo: Grupo;
  onRemoveContainer?: (contId: number) => void;
  onClickOverride?: () => void;
}) {
  const navigate = useNavigate();
  const visible = grupo.contenedores.slice(0, MAX_VISIBLE);
  const remaining = grupo.contenedores.length - MAX_VISIBLE;
  const hasPeligrosa = grupo.contenedores.some((c) => c.mercancia_peligrosa);

  const handleRemove = (e: React.MouseEvent, contId: number) => {
    e.stopPropagation();
    if (confirm("¿Remover este contenedor del grupo?")) {
      onRemoveContainer?.(contId);
    }
  };

  return (
    <div
      onClick={() => {
        if (onClickOverride) { onClickOverride(); return; }
        navigate(`/contenedores/${grupo.contenedores[0]?.id}`);
      }}
      className={cn(
        "relative cursor-pointer rounded-md border-2 border-dashed bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        hasPeligrosa && "border-orange-500"
      )}
    >
      {hasPeligrosa && (
        <div
          className="absolute inset-0 rounded-md opacity-10"
          style={{
            background: "repeating-linear-gradient(45deg, #eab308, #eab308 6px, #f97316 6px, #f97316 12px)",
          }}
        />
      )}
      <div className="relative space-y-2">
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-bold">{grupo.nombre}</span>
          <span className="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {grupo.contenedores.length}
          </span>
        </div>
        <div className="space-y-1 rounded-md bg-background/50 p-1.5">
          {visible.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 text-[10px] group">
              <Ship className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="font-mono truncate flex-1">{c.matricula}</span>
              {onRemoveContainer && (
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={(e) => handleRemove(e, c.id)}
                  title="Remover del grupo"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
              {c.mercancia_peligrosa && <AlertTriangle className="h-2.5 w-2.5 text-orange-500 shrink-0" />}
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-[10px] text-muted-foreground pl-4">+{remaining} contenedores</p>
          )}
        </div>
      </div>
    </div>
  );
}
