import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./KanbanColumn";
import { MovimientoDialog } from "./MovimientoDialog";
import api from "@/lib/api";
import { Loader2, Trash2, Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Estado {
  id: number;
  nombre: string;
  color: string;
}

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

export interface KanbanFilters {
  matricula: string;
  clienteId: string;
  tipoIso: string;
  soloPeligrosa: boolean;
}

const TRASH_ID = "trash-zone";
const GROUP_PREFIX = "group:";

export function KanbanBoard({ filters }: { filters: KanbanFilters }) {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingContenedor, setMovingContenedor] = useState<Contenedor | null>(null);
  const [targetEstadoId, setTargetEstadoId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingContenedor, setDeletingContenedor] = useState<Contenedor | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");

  const fetchAll = async () => {
    try {
      const [estRes, contRes, grpRes] = await Promise.all([
        api.get("/estados"),
        api.get("/contenedores"),
        api.get("/grupos"),
      ]);
      setEstados(estRes.data);
      setContenedores(contRes.data);
      setGrupos(grpRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set());
  }, [selectionMode]);

  const groupedContIds = useMemo(() => {
    const ids = new Set<number>();
    grupos.forEach((g) => g.contenedores.forEach((c) => ids.add(c.id)));
    return ids;
  }, [grupos]);

  const filteredContenedores = useMemo(() => {
    return contenedores.filter((c) => {
      if (filters.matricula && !c.matricula.toUpperCase().includes(filters.matricula.toUpperCase())) return false;
      if (filters.clienteId && filters.clienteId !== "todos" && c.cliente_id?.toString() !== filters.clienteId) return false;
      if (filters.tipoIso && filters.tipoIso !== "todos" && c.tipo_iso !== filters.tipoIso) return false;
      if (filters.soloPeligrosa && !c.mercancia_peligrosa) return false;
      return true;
    });
  }, [contenedores, filters]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

  const startAutoScroll = useCallback(() => {
    dragRef.current = true;
    const container = scrollRef.current;
    if (!container) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      const threshold = 100;
      const speed = 10;
      if (e.clientX - rect.left < threshold) {
        container.scrollLeft -= speed * (1 - (e.clientX - rect.left) / threshold);
      } else if (rect.right - e.clientX < threshold) {
        container.scrollLeft += speed * (1 - (rect.right - e.clientX) / threshold);
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  const onDragStart = () => {
    setIsDragging(true);
    startAutoScroll();
  };

  const onDragEnd = (result: DropResult) => {
    setIsDragging(false);
    dragRef.current = false;

    if (result.combine) {
      const sourceContId = parseInt(result.draggableId);
      const targetContId = parseInt(result.combine.draggableId);
      if (result.source.droppableId !== result.combine.droppableId) return;
      setSelectedIds(new Set([sourceContId, targetContId]));
      setSelectionMode(true);
      setShowGroupDialog(true);
      return;
    }

    if (!result.destination) return;

    const destId = result.destination.droppableId;
    const sourceId = result.source.droppableId;

    if (sourceId.startsWith(GROUP_PREFIX)) {
      const grupoId = parseInt(sourceId.replace(GROUP_PREFIX, ""));
      if (destId === TRASH_ID) return;
      setMovingGrupoId(grupoId);
      setTargetEstadoId(parseInt(destId));
      return;
    }

    if (destId === TRASH_ID) {
      const contId = parseInt(result.draggableId);
      const cont = contenedores.find((c) => c.id === contId);
      if (cont) setDeletingContenedor(cont);
      return;
    }

    if (destId.startsWith(GROUP_PREFIX)) {
      const grupoId = parseInt(destId.replace(GROUP_PREFIX, ""));
      const contId = parseInt(result.draggableId);
      addToGroup(grupoId, contId);
      return;
    }

    const contenedorId = parseInt(result.draggableId);
    const newEstadoId = parseInt(destId);
    const contenedor = contenedores.find((c) => c.id === contenedorId);
    if (!contenedor || contenedor.estado_id === newEstadoId) return;

    setMovingContenedor(contenedor);
    setTargetEstadoId(newEstadoId);
  };

  const [movingGrupoId, setMovingGrupoId] = useState<number | null>(null);

  const addToGroup = async (grupoId: number, contId: number) => {
    try {
      await api.post(`/grupos/${grupoId}/contenedores/${contId}`);
      fetchAll();
    } catch { alert("Error al agregar al grupo"); }
  };

  const removeFromGroup = async (grupoId: number, contId: number) => {
    try {
      await api.delete(`/grupos/${grupoId}/contenedores/${contId}`);
      fetchAll();
    } catch { alert("Error al remover del grupo"); }
  };

  const deleteGrupo = async (grupoId: number) => {
    if (!confirm("¿Desagrupar todos los contenedores?")) return;
    try {
      await api.delete(`/grupos/${grupoId}`);
      fetchAll();
    } catch { alert("Error al eliminar grupo"); }
  };

  const handleCreateGroup = async () => {
    if (selectedIds.size < 2) return;
    const ids = Array.from(selectedIds);
    try {
      await api.post("/grupos", {
        nombre: groupName || "Grupo sin nombre",
        contenedor_ids: ids,
        estado_id: contenedores.find((c) => c.id === ids[0])?.estado_id,
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      setShowGroupDialog(false);
      setGroupName("");
      fetchAll();
    } catch { alert("Error al crear grupo"); }
  };

  const handleMoveGroup = async (newLat?: number, newLng?: number, notas?: string, fecha?: string) => {
    if (!movingGrupoId || targetEstadoId === null) return;
    try {
      await api.put(`/grupos/${movingGrupoId}/mover`, {
        nuevo_estado_id: targetEstadoId,
        ubicacion_lat: newLat,
        ubicacion_lng: newLng,
        notas: notas || "",
        fecha: fecha || undefined,
      });
      fetchAll();
    } catch { alert("Error al mover grupo"); }
    setMovingGrupoId(null);
    setTargetEstadoId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContenedor) return;
    try {
      await api.delete(`/contenedores/${deletingContenedor.id}`);
      setContenedores((prev) => prev.filter((c) => c.id !== deletingContenedor.id));
    } catch { alert("Error al eliminar el contenedor"); }
    setDeletingContenedor(null);
  };

  const handleMoveConfirm = async (newLat?: number, newLng?: number, notas?: string, fecha?: string) => {
    if (!movingContenedor || targetEstadoId === null) return;
    const prevEstadoId = movingContenedor.estado_id;
    setContenedores((prev) =>
      prev.map((c) => (c.id === movingContenedor.id ? { ...c, estado_id: targetEstadoId } : c))
    );
    setMovingContenedor(null);
    setTargetEstadoId(null);
    try {
      await api.put(`/contenedores/${movingContenedor.id}/mover`, {
        nuevo_estado_id: targetEstadoId,
        ubicacion_lat: newLat,
        ubicacion_lng: newLng,
        notas: notas || "",
        fecha: fecha || undefined,
      });
    } catch {
      setContenedores((prev) =>
        prev.map((c) => (c.id === movingContenedor.id ? { ...c, estado_id: prevEstadoId } : c))
      );
      alert("Error al mover el contenedor");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDialogCancel = () => {
    setShowGroupDialog(false);
    setGroupName("");
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const movingGrupo = movingGrupoId ? grupos.find((g) => g.id === movingGrupoId) : null;

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <Button
          variant={selectionMode ? "default" : "outline"}
          size="sm"
          onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
        >
          <Layers className="mr-1 h-3 w-3" />
          {selectionMode ? "Salir de agrupar" : "Agrupar"}
        </Button>
        {selectionMode && selectedIds.size >= 2 && (
          <Button size="sm" onClick={() => setShowGroupDialog(true)}>
            Agrupar seleccionados ({selectedIds.size})
          </Button>
        )}
        {selectionMode && (
          <span className="text-xs text-muted-foreground">Selecciona contenedores para agrupar</span>
        )}
      </div>

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-col h-full">
          <Droppable droppableId={TRASH_ID} isDropDisabled={!isDragging}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={cn(
                  "mb-3 flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200",
                  isDragging ? "h-16 opacity-100" : "h-0 opacity-0 overflow-hidden border-transparent",
                  snapshot.isDraggingOver ? "border-destructive bg-destructive/10" : "border-muted-foreground/30 bg-muted/20"
                )}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Trash2 className={cn("h-5 w-5", snapshot.isDraggingOver ? "text-destructive" : "text-muted-foreground")} />
                  <span className={cn(snapshot.isDraggingOver ? "text-destructive font-medium" : "text-muted-foreground")}>
                    Soltar aquí para eliminar
                  </span>
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <div className="flex-1 min-h-0 overflow-auto" id="kanban-scroll-container" ref={scrollRef}>
            <div className="flex gap-3 min-h-full pb-4">
              {estados.map((estado) => (
                <Droppable key={estado.id} droppableId={estado.id.toString()} type="CONTENEDOR" isCombineEnabled={!selectionMode}>
                  {(provided, snapshot) => (
                    <KanbanColumn
                      estado={estado}
                      contenedores={filteredContenedores.filter((c) => c.estado_id === estado.id && !groupedContIds.has(c.id))}
                      grupos={grupos.filter((g) => g.estado_id === estado.id)}
                      provided={provided}
                      snapshot={snapshot}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelect}
                      onRemoveFromGroup={removeFromGroup}
                      onDeleteGroup={deleteGrupo}
                    />
                  )}
                </Droppable>
              ))}
            </div>
          </div>
        </div>
      </DragDropContext>

      {movingContenedor && targetEstadoId !== null && (
        <MovimientoDialog
          contenedor={movingContenedor}
          targetEstado={estados.find((e) => e.id === targetEstadoId)?.nombre || ""}
          onConfirm={handleMoveConfirm}
          onCancel={() => { setMovingContenedor(null); setTargetEstadoId(null); }}
        />
      )}

      {movingGrupo && targetEstadoId !== null && (
        <MovimientoDialog
          contenedor={{ id: movingGrupo.id, matricula: movingGrupo.nombre }}
          targetEstado={estados.find((e) => e.id === targetEstadoId)?.nombre || ""}
          onConfirm={handleMoveGroup}
          onCancel={() => { setMovingGrupoId(null); setTargetEstadoId(null); }}
        />
      )}

      {deletingContenedor && (
        <MovimientoDialog
          contenedor={deletingContenedor}
          targetEstado="🗑️ Eliminar"
          onConfirm={() => handleDeleteConfirm()}
          onCancel={() => setDeletingContenedor(null)}
          isDelete
        />
      )}

      <Dialog open={showGroupDialog} onOpenChange={(open) => { if (!open) handleDialogCancel(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nombre del grupo"
            />
            <p className="text-xs text-muted-foreground">{selectedIds.size} contenedores seleccionados</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogCancel}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGroup}>Agrupar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
