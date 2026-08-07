import { useState, useEffect, useMemo, useCallback } from "react";
import {
  DndContext, DragOverlay, PointerSensor, pointerWithin, useDroppable, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { ContenedorCard } from "./ContenedorCard";
import { MovimientoDialog } from "./MovimientoDialog";
import api from "@/lib/api";
import { Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export interface KanbanFilters {
  matricula: string;
  clienteId: string;
  tipoIso: string;
  soloPeligrosa: boolean;
  grupoNombre: string;
}

interface Props {
  filters: KanbanFilters;
  selectionMode: boolean;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}

const TRASH_ID = "trash-bin";

export function KanbanBoard({ filters, selectionMode, selectedIds, onToggleSelect }: Props) {
  const [estados, setEstados] = useState<Estado[]>([]);
  const [contenedores, setContenedores] = useState<Contenedor[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDragId, setOverDragId] = useState<string | null>(null);
  const [movingContenedor, setMovingContenedor] = useState<Contenedor | null>(null);
  const [targetEstadoId, setTargetEstadoId] = useState<number | null>(null);
  const [deletingContenedor, setDeletingContenedor] = useState<Contenedor | null>(null);
  const [movingGrupoId, setMovingGrupoId] = useState<number | null>(null);
  const [deletingGrupoId, setDeletingGrupoId] = useState<number | null>(null);
  const [groupingPair, setGroupingPair] = useState<{ sourceId: number; targetId: number } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [editingSinEstado, setEditingSinEstado] = useState<Contenedor | null>(null);
  const [sinEstadoNew, setSinEstadoNew] = useState<string>("");
  const [editingSinEstadoGrupo, setEditingSinEstadoGrupo] = useState<Grupo | null>(null);
  const [sinEstadoGrupoNew, setSinEstadoGrupoNew] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchAll = async () => {
    try {
      const [estRes, contRes, grpRes] = await Promise.all([
        api.get("/estados"), api.get("/contenedores"), api.get("/grupos"),
      ]);
      setEstados(estRes.data);
      setContenedores(contRes.data);
      setGrupos(grpRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const groupedContIds = useMemo(() => {
    const ids = new Set<number>();
    grupos.forEach((g) => g.contenedores.forEach((c) => ids.add(c.id)));
    return ids;
  }, [grupos]);

  const filteredContenedores = useMemo(() => {
    return contenedores.filter((c) => containerMatchesFilter(c, filters));
  }, [contenedores, filters]);

  const filteredGrupos = useMemo(() => {
    return grupos.filter((g) => {
      if (filters.grupoNombre && !g.nombre.toUpperCase().includes(filters.grupoNombre.toUpperCase())) {
        return false;
      }
      return g.contenedores.some((c) => containerMatchesFilter(c, filters));
    });
  }, [grupos, filters]);

  const sinEstadoContenedores = useMemo(() => {
    const validIds = new Set(estados.map((e) => e.id));
    return filteredContenedores.filter((c) => !c.estado_id || !validIds.has(c.estado_id));
  }, [filteredContenedores, estados]);

  const sinEstadoGrupos = useMemo(() => {
    const validIds = new Set(estados.map((e) => e.id));
    return filteredGrupos.filter((g) => !g.estado_id || !validIds.has(g.estado_id));
  }, [filteredGrupos, estados]);

  const handleAssignSinEstado = async () => {
    if (!editingSinEstado || !sinEstadoNew) return;
    try {
      await api.put(`/contenedores/${editingSinEstado.id}`, {
        estado_id: parseInt(sinEstadoNew),
      });
      setEditingSinEstado(null);
      setSinEstadoNew("");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al asignar estado");
    }
  };

  const handleAssignSinEstadoGrupo = async () => {
    if (!editingSinEstadoGrupo || !sinEstadoGrupoNew) return;
    try {
      await api.put(`/grupos/${editingSinEstadoGrupo.id}`, {
        estado_id: parseInt(sinEstadoGrupoNew),
      });
      setEditingSinEstadoGrupo(null);
      setSinEstadoGrupoNew("");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al asignar estado");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setOverDragId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverDragId(event.over?.id ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setOverDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Trash zone
    if (overId === TRASH_ID) {
      if (activeId.startsWith("group-")) {
        const grupoId = parseInt(activeId.replace("group-", ""));
        setDeletingGrupoId(grupoId);
      } else {
        const contId = parseInt(activeId);
        const cont = contenedores.find((c) => c.id === contId);
        if (cont) setDeletingContenedor(cont);
      }
      return;
    }

    // Dropping one ungrouped container directly on another creates a group.
    if (!activeId.startsWith("group-") && /^\d+$/.test(overId) && activeId !== overId) {
      const sourceId = Number(activeId);
      const targetId = Number(overId);
      const source = contenedores.find((c) => c.id === sourceId);
      const target = contenedores.find((c) => c.id === targetId);
      const sourceGroup = grupos.find((g) => g.contenedores.some((c) => c.id === sourceId));
      const targetGroup = grupos.find((g) => g.contenedores.some((c) => c.id === targetId));

      if (source && target && !sourceGroup && !targetGroup) {
        setGroupingPair({ sourceId, targetId });
        return;
      }
    }

    // Dropping a container on an existing group adds it to that group.
    if (!activeId.startsWith("group-") && overId.startsWith("group-")) {
      const groupId = Number(overId.replace("group-", ""));
      const containerId = Number(activeId);
      addToGroup(groupId, containerId);
      return;
    }

    // Moving a group
    if (activeId.startsWith("group-")) {
      const grupoId = parseInt(activeId.replace("group-", ""));
      const targetEstado = _findParentEstado(overId, estados, filteredContenedores, grupos, groupedContIds);
      if (targetEstado != null) {
        setMovingGrupoId(grupoId);
        setTargetEstadoId(targetEstado);
      }
      return;
    }

    // Container move
    const contId = parseInt(activeId);
    const cont = contenedores.find((c) => c.id === contId);
    if (!cont) return;

    const targetEstado = _findParentEstado(overId, estados, filteredContenedores, grupos, groupedContIds);
    if (targetEstado != null && targetEstado !== cont.estado_id) {
      setMovingContenedor(cont);
      setTargetEstadoId(targetEstado);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContenedor) return;
    try {
      await api.delete(`/contenedores/${deletingContenedor.id}`);
      setContenedores((prev) => prev.filter((c) => c.id !== deletingContenedor.id));
    } catch { alert("Error al eliminar"); }
    setDeletingContenedor(null);
  };

  const handleDeleteGrupoConfirm = async () => {
    if (!deletingGrupoId) return;
    try { await api.delete(`/grupos/${deletingGrupoId}`); fetchAll(); }
    catch { alert("Error al eliminar grupo"); }
    setDeletingGrupoId(null);
  };

  const addToGroup = async (grupoId: number, contenedorId: number) => {
    try {
      await api.post(`/grupos/${grupoId}/contenedores/${contenedorId}`);
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al agregar el contenedor al grupo");
    }
  };

  const handleCreateDraggedGroup = async () => {
    if (!groupingPair) return;
    const source = contenedores.find((c) => c.id === groupingPair.sourceId);
    const target = contenedores.find((c) => c.id === groupingPair.targetId);
    if (!source || !target) return;

    try {
      await api.post("/grupos", {
        nombre: groupName.trim() || "Grupo sin nombre",
        estado_id: source.estado_id,
        contenedor_ids: [source.id, target.id],
      });
      setGroupingPair(null);
      setGroupName("");
      fetchAll();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al crear grupo");
    }
  };

  const handleMoveConfirm = async (newLat?: number, newLng?: number, notas?: string, fecha?: string) => {
    if (!movingContenedor || targetEstadoId === null) return;
    const prevEstadoId = movingContenedor.estado_id;
    setContenedores((prev) => prev.map((c) =>
      c.id === movingContenedor.id ? { ...c, estado_id: targetEstadoId } : c
    ));
    setMovingContenedor(null);
    setTargetEstadoId(null);
    try {
      await api.put(`/contenedores/${movingContenedor.id}/mover`, {
        nuevo_estado_id: targetEstadoId,
        ubicacion_lat: newLat, ubicacion_lng: newLng,
        notas: notas || "", fecha: fecha || undefined,
      });
    } catch {
      setContenedores((prev) => prev.map((c) =>
        c.id === movingContenedor.id ? { ...c, estado_id: prevEstadoId } : c
      ));
      alert("Error al mover");
    }
  };

  const handleMoveGroup = async (newLat?: number, newLng?: number, notas?: string, fecha?: string) => {
    if (!movingGrupoId || targetEstadoId === null) return;
    try {
      await api.put(`/grupos/${movingGrupoId}/mover`, {
        nuevo_estado_id: targetEstadoId,
        ubicacion_lat: newLat, ubicacion_lng: newLng,
        notas: notas || "", fecha: fecha || undefined,
      });
      fetchAll();
    } catch { alert("Error al mover grupo"); }
    setMovingGrupoId(null);
    setTargetEstadoId(null);
  };

  const removeFromGroup = async (grupoId: number, contId: number) => {
    try { await api.delete(`/grupos/${grupoId}/contenedores/${contId}`); fetchAll(); }
    catch { alert("Error al remover del grupo"); }
  };

  const deleteGrupo = async (grupoId: number) => {
    if (!confirm("¿Desagrupar todos los contenedores?")) return;
    try { await api.delete(`/grupos/${grupoId}`); fetchAll(); }
    catch { alert("Error al eliminar grupo"); }
  };

  const activeDragCont = useMemo(() => {
    if (!activeDragId || activeDragId.startsWith("group-")) return null;
    const id = parseInt(activeDragId);
    return filteredContenedores.find((c) => c.id === id) || null;
  }, [activeDragId, filteredContenedores]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const movingGrupo = movingGrupoId ? grupos.find((g) => g.id === movingGrupoId) : null;
  const deletingGrupo = deletingGrupoId ? grupos.find((g) => g.id === deletingGrupoId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDragId(null);
          setOverDragId(null);
        }}
      >
        <div className="flex flex-col h-full">
          <TrashDropZone active={activeDragId !== null} />
          <div className="flex-1 min-h-0 overflow-auto h-full">
            <div className="flex gap-3 h-full pb-4">
              {(() => {
                const columns: React.ReactElement[] = estados.map((estado) => (
                  <KanbanColumn
                    key={estado.id}
                    estado={estado}
                    contenedores={filteredContenedores.filter((c) =>
                      c.estado_id === estado.id && !groupedContIds.has(c.id)
                    )}
                    grupos={filteredGrupos.filter((g) => g.estado_id === estado.id)}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onToggleSelect={onToggleSelect}
                    onDeleteGroup={deleteGrupo}
                    onRemoveFromGroup={removeFromGroup}
                    groupTargetId={
                      activeDragId && /^\d+$/.test(activeDragId) && overDragId && /^\d+$/.test(overDragId) && activeDragId !== overDragId
                        ? Number(overDragId)
                        : null
                    }
                  />
                ));
                if (sinEstadoContenedores.length > 0 || sinEstadoGrupos.length > 0) {
                  columns.push(
                    <KanbanColumn
                      key="sin-estado"
                      estado={{ id: -1, nombre: "Sin Estado", color: "#ef4444" }}
                      contenedores={sinEstadoContenedores.filter((c) => !groupedContIds.has(c.id))}
                      grupos={sinEstadoGrupos}
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      onToggleSelect={onToggleSelect}
                      onDeleteGroup={deleteGrupo}
                      onRemoveFromGroup={removeFromGroup}
                      groupTargetId={null}
                      onCardClick={(cont) => {
                        setEditingSinEstado(cont);
                        setSinEstadoNew("");
                      }}
                      onGroupClick={(grupo) => {
                        setEditingSinEstadoGrupo(grupo);
                        setSinEstadoGrupoNew("");
                      }}
                    />
                  );
                }
                return columns.map((col, i) => {
                  const isFirst = i === 0;
                  const isLast = i === columns.length - 1;
                  return (
                    <div
                      key={col.key}
                      className={cn("h-full shrink-0", isFirst && "ml-4", isLast && "mr-4")}
                    >
                      {col}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragId?.startsWith("group-") && grupos.find((g) => `group-${g.id}` === activeDragId) ? (
            <div className="w-72 rounded-md border bg-card shadow-lg ring-1 ring-primary">
              <GrupoCardPreview grupo={grupos.find((g) => `group-${g.id}` === activeDragId)!} />
            </div>
          ) : activeDragCont ? (
            <div className="rounded-md border bg-card p-3 shadow-lg ring-1 ring-primary w-72">
              <div className="font-mono text-sm font-bold">{activeDragCont.matricula}</div>
              {activeDragCont.cliente && (
                <div className="text-xs text-muted-foreground">{activeDragCont.cliente.nombre}</div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
      {deletingGrupo && (
        <MovimientoDialog
          contenedor={{ id: deletingGrupo.id, matricula: deletingGrupo.nombre }}
          targetEstado="🗑️ Eliminar grupo"
          onConfirm={() => handleDeleteGrupoConfirm()}
          onCancel={() => setDeletingGrupoId(null)}
          isDelete
        />
      )}

      <Dialog open={!!groupingPair} onOpenChange={(open) => !open && setGroupingPair(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Crear grupo</DialogTitle>
            <DialogDescription>
              Has colocado dos contenedores juntos. Indica el nombre del grupo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Nombre del grupo"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupingPair(null)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDraggedGroup}>Crear grupo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSinEstado} onOpenChange={(open) => !open && setEditingSinEstado(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar estado</DialogTitle>
            <DialogDescription>
              {editingSinEstado ? `El contenedor ${editingSinEstado.matricula} no tiene un estado válido.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Estado *</Label>
            <Select value={sinEstadoNew} onValueChange={setSinEstadoNew}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSinEstado(null)}>Cancelar</Button>
            <Button onClick={handleAssignSinEstado} disabled={!sinEstadoNew}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSinEstadoGrupo} onOpenChange={(open) => !open && setEditingSinEstadoGrupo(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar estado al grupo</DialogTitle>
            <DialogDescription>
              {editingSinEstadoGrupo
                ? `El grupo "${editingSinEstadoGrupo.nombre}" (${editingSinEstadoGrupo.contenedores.length} contenedores) no tiene un estado válido.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Estado *</Label>
            <Select value={sinEstadoGrupoNew} onValueChange={setSinEstadoGrupoNew}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {estados.map((e) => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSinEstadoGrupo(null)}>Cancelar</Button>
            <Button onClick={handleAssignSinEstadoGrupo} disabled={!sinEstadoGrupoNew}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TrashDropZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRASH_ID });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed left-0 right-0 top-14 z-50 mx-4 flex h-14 items-center justify-center rounded-lg border-2 border-dashed px-6 transition-opacity duration-200 backdrop-blur-sm",
        active ? "opacity-100" : "pointer-events-none opacity-0",
        isOver
          ? "border-destructive bg-destructive/20 text-destructive shadow-lg"
          : "border-muted-foreground/40 bg-card/90 text-muted-foreground shadow"
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <Trash2 className="h-5 w-5" />
        <span>Soltar aquí para eliminar</span>
      </div>
    </div>
  );
}

function GrupoCardPreview({ grupo }: { grupo: Grupo }) {
  return (
    <div className="rounded-md border-2 border-dashed bg-card p-3">
      <div className="text-sm font-bold">{grupo.nombre}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {grupo.contenedores.length} contenedores
      </div>
    </div>
  );
}

function containerMatchesFilter(c: Contenedor, filters: KanbanFilters): boolean {
  if (filters.matricula && !c.matricula.toUpperCase().includes(filters.matricula.toUpperCase())) return false;
  if (filters.clienteId && filters.clienteId !== "todos" && c.cliente_id?.toString() !== filters.clienteId) return false;
  if (filters.tipoIso && filters.tipoIso !== "todos" && c.tipo_iso !== filters.tipoIso) return false;
  if (filters.soloPeligrosa && !c.mercancia_peligrosa) return false;
  return true;
}

function _findParentEstado(
  overId: string,
  estados: Estado[],
  contenedores: Contenedor[],
  grupos: Grupo[],
  groupedContIds: Set<number>
): number | null {
  for (const e of estados) {
    const eId = `estado-${e.id}`;
    if (overId === eId) return e.id;
    const colConts = contenedores.filter((c) => c.estado_id === e.id && !groupedContIds.has(c.id));
    if (colConts.some((c) => c.id.toString() === overId)) return e.id;
    const colGrupos = grupos.filter((g) => g.estado_id === e.id);
    if (colGrupos.some((g) => `group-${g.id}` === overId)) return e.id;
  }
  return null;
}
