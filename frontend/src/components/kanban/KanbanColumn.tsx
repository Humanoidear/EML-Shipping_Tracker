import { Draggable, Droppable, type DroppableProvided, type DroppableStateSnapshot } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { ContenedorCard } from "./ContenedorCard";
import { GrupoCard } from "./GrupoCard";

interface Contenedor {
  id: number;
  matricula: string;
  estado_id: number;
  cliente_id?: number | null;
  cliente?: { nombre: string } | null;
  tipo_iso?: string;
  mercancia_peligrosa: boolean;
  peso_kg?: number;
}

interface Grupo {
  id: number;
  nombre: string;
  estado_id: number;
  contenedores: Contenedor[];
}

interface Estado {
  id: number;
  nombre: string;
  color: string;
}

interface Props {
  estado: Estado;
  contenedores: Contenedor[];
  grupos: Grupo[];
  provided: DroppableProvided;
  snapshot: DroppableStateSnapshot;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
  onRemoveFromGroup: (grupoId: number, contId: number) => void;
  onDeleteGroup: (grupoId: number) => void;
}

const GROUP_PREFIX = "group:";

export function KanbanColumn({
  estado, contenedores, grupos, provided, snapshot,
  selectionMode, selectedIds, onToggleSelect, onRemoveFromGroup, onDeleteGroup,
}: Props) {
  const numContenedores = contenedores.length;

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-card",
        snapshot.isDraggingOver && "border-primary bg-primary/5"
      )}
    >
      <div
        className="mx-3 mt-3 rounded-md px-3 py-2 text-sm font-semibold text-white"
        style={{ backgroundColor: estado.color }}
      >
        {estado.nombre}
        <span className="ml-2 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
          {contenedores.length + grupos.length}
        </span>
      </div>
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="flex-1 space-y-2 overflow-y-auto p-3"
      >
        {contenedores.map((cont, index) => (
          <div key={cont.id} className={cn("flex items-start gap-1", selectionMode && "cursor-pointer")}>
            {selectionMode && (
              <div className="pt-3 pl-1" onClick={(e) => { e.stopPropagation(); onToggleSelect(cont.id); }}>
                <div className={cn(
                  "h-4 w-4 rounded border-2 flex items-center justify-center",
                  selectedIds.has(cont.id) ? "bg-primary border-primary" : "border-muted-foreground/40"
                )}>
                  {selectedIds.has(cont.id) && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1" onClick={() => selectionMode && onToggleSelect(cont.id)}>
              <ContenedorCard contenedor={cont} index={index} disableClick={selectionMode} />
            </div>
          </div>
        ))}

        {grupos.map((grupo, index) => (
          <Droppable key={`group-${grupo.id}`} droppableId={`${GROUP_PREFIX}${grupo.id}`} type="CONTENEDOR">
            {(groupProvided, groupSnapshot) => (
              <div ref={groupProvided.innerRef} {...groupProvided.droppableProps}
                className={cn(
                  "rounded-md transition-colors",
                  groupSnapshot.isDraggingOver && "bg-primary/10"
                )}
              >
                <Draggable draggableId={`group-${grupo.id}`} index={numContenedores + index}>
                  {(provided, snapshot) => (
                    <GrupoCard
                      grupo={grupo}
                      index={numContenedores + index}
                      isDragging={snapshot.isDragging}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  )}
                </Draggable>
                <div className="flex justify-end gap-1 px-2 pb-1">
                  <button
                    className="text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteGroup(grupo.id)}
                  >
                    Desagrupar
                  </button>
                </div>
                {groupProvided.placeholder}
              </div>
            )}
          </Droppable>
        ))}

        {provided.placeholder}

        {contenedores.length === 0 && grupos.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Arrastra contenedores aquí
          </p>
        )}
      </div>
    </div>
  );
}
