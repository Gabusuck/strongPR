import { useState, useRef } from "react";
import { LayoutTemplate, Trash2, Plus, Dumbbell, Eye, Edit2, GripVertical } from "lucide-react";
import type { WorkoutTemplate, WorkoutExercise, Exercise } from "../types";
import { RoutinePreviewModal } from "./RoutinePreviewModal";
import { CreateRoutineModal } from "./CreateRoutineModal";
import { useLongPress } from "../utils/useLongPress";
import { translateExerciseName } from "../utils/translateExercise";

interface RoutinesViewProps {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onStartWorkoutFromTemplate: (template: WorkoutTemplate) => void;
  onAddTemplate: (name: string, exercises: WorkoutExercise[], templateId?: string) => void;
  onDeleteTemplate: (id: string) => void;
  onReorderTemplates?: (templates: WorkoutTemplate[]) => void;
}

export function RoutinesView({ templates, exercises, onStartWorkoutFromTemplate, onAddTemplate, onDeleteTemplate, onReorderTemplates }: RoutinesViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);

  // Drag and drop state for routines
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const touchStartY = useRef<number>(0);
  const touchActiveIdx = useRef<number | null>(null);
  const routineContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchActiveIdx.current = idx;
    setDraggingIdx(idx);
    setDragOverIdx(idx);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchActiveIdx.current === null || !onReorderTemplates) return;
    const currentY = e.touches[0].clientY;
    const activeIdx = touchActiveIdx.current;
    for (let i = 0; i < routineContainerRefs.current.length; i++) {
      const el = routineContainerRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (currentY >= rect.top && currentY <= rect.bottom) {
          if (i !== activeIdx) {
            const list = [...templates];
            const [moved] = list.splice(activeIdx, 1);
            list.splice(i, 0, moved);
            onReorderTemplates(list);
            touchActiveIdx.current = i;
            setDraggingIdx(i);
            setDragOverIdx(i);
            if (window.navigator?.vibrate) {
              window.navigator.vibrate(10);
            }
          }
          break;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    touchActiveIdx.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragStart = (idx: number, e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
    setDraggingIdx(idx);
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingIdx !== null && draggingIdx !== toIdx && onReorderTemplates) {
      const list = [...templates];
      const [moved] = list.splice(draggingIdx, 1);
      list.splice(toIdx, 0, moved);
      onReorderTemplates(list);
    }
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
  };

  const { bind } = useLongPress<WorkoutTemplate>({
    onLongPress: (template) => {
      window.customConfirm(
        "Eliminar Rotina",
        `Tens a certeza que desejas eliminar a rotina "${template.name}"?`,
        () => onDeleteTemplate(template.id)
      );
    },
    onClick: (template) => {
      setPreviewTemplate(template);
    }
  });

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>As Minhas Rotinas</p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>{templates.length} rotina{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            width: 40, height: 40,
            borderRadius: 14,
            background: "var(--accent-gradient)",
            border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 3px 12px var(--accent-glow)",
          }}
        >
          <Plus size={20} color="#fff" />
        </button>
      </div>

      {/* Modal: Create or Edit Routine */}
      <CreateRoutineModal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingTemplate(null);
        }}
        onSave={(name, exList, tId) => {
          onAddTemplate(name, exList, tId);
          setShowCreate(false);
          setEditingTemplate(null);
        }}
        exercises={exercises}
        initialTemplate={editingTemplate}
      />

      {/* Templates list */}
      {templates.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "35vh", gap: 12, color: "var(--text-secondary)" }}>
          <LayoutTemplate size={44} style={{ opacity: 0.3 }} />
          <p style={{ fontWeight: 700, fontSize: "1rem" }}>Sem rotinas criadas</p>
          <p style={{ fontSize: "0.83rem", textAlign: "center", maxWidth: 220 }}>Cria a tua primeira rotina com o botão + acima.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {templates.map((template, i) => {
            const isDragging = draggingIdx === i;
            const isDragOver = dragOverIdx === i && draggingIdx !== null && draggingIdx !== i;

            return (
              <div 
                key={template.id}
                ref={(el) => { routineContainerRefs.current[i] = el; }}
                draggable={true}
                onDragStart={(e) => handleDragStart(i, e)}
                onDragOver={(e) => handleDragOver(i, e)}
                onDrop={(e) => handleDrop(i, e)}
                onDragEnd={handleDragEnd}
                {...bind(template)}
                style={{
                  borderBottom: i < templates.length - 1 ? "1px solid var(--border-color)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  userSelect: isDragging ? "none" : "auto",
                  backgroundColor: isDragging ? "rgba(91,94,244,0.08)" : isDragOver ? "rgba(91,94,244,0.03)" : "#fff",
                  transform: isDragging ? "scale(1.02)" : "scale(1)",
                  boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.12)" : "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 10 }}>
                  {/* Drag Handle */}
                  {templates.length > 1 && onReorderTemplates && (
                    <div
                      style={{
                        touchAction: "none",
                        cursor: "grab",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isDragging ? "var(--accent-color)" : "var(--text-muted)",
                        padding: "6px 2px",
                        flexShrink: 0
                      }}
                      title="Arrasta para mudar a ordem"
                      onTouchStart={(e) => handleTouchStart(i, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical size={20} />
                    </div>
                  )}

                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(91,94,244,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <LayoutTemplate size={18} color="var(--accent-color)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                      {template.exercises.length > 0
                        ? template.exercises.map(e => translateExerciseName(e.name)).join(" · ")
                        : "Sem exercícios"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowCreate(true);
                      }}
                      title="Editar rotina"
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(91,94,244,0.08)",
                        color: "var(--accent-color)",
                        border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setPreviewTemplate(template)}
                      title="Ver exercícios"
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(91,94,244,0.08)",
                        color: "var(--accent-color)",
                        border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => {
                        window.customConfirm("Eliminar Rotina", `Eliminar "${template.name}"?`, () => onDeleteTemplate(template.id));
                      }}
                      title="Eliminar rotina"
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,59,48,0.1)",
                        border: "none",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={16} color="var(--danger)" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Starter tip */}
      {templates.length === 0 && (
        <div style={{ marginTop: 16, background: "rgba(91,94,244,0.06)", border: "1px solid rgba(91,94,244,0.15)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <Dumbbell size={18} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Dica</p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                Cria rotinas como "Push Day", "Pull Day" ou "Pernas" para organizar os teus exercícios favoritos e começar a treinar quando quiseres.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Routine Preview Modal */}
      <RoutinePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onStartWorkout={onStartWorkoutFromTemplate}
        onEdit={(t) => {
          setPreviewTemplate(null);
          setEditingTemplate(t);
          setShowCreate(true);
        }}
      />
    </div>
  );
}
