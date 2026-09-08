import { useState } from "react";
import { LayoutTemplate, Trash2, Plus, Dumbbell, Eye, Edit2 } from "lucide-react";
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

  const moveTemplateUp = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index <= 0 || !onReorderTemplates) return;
    const copy = [...templates];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onReorderTemplates(copy);
  };

  const moveTemplateDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index >= templates.length - 1 || !onReorderTemplates) return;
    const copy = [...templates];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onReorderTemplates(copy);
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
          {templates.map((template, i) => (
            <div 
              key={template.id} 
              {...bind(template)}
              style={{
                borderBottom: i < templates.length - 1 ? "1px solid var(--border-color)" : "none",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", gap: 10 }}>
                {/* Reorder Arrows for Templates */}
                {templates.length > 1 && onReorderTemplates && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={(e) => moveTemplateUp(i, e)}
                      disabled={i === 0}
                      style={{
                        width: 22, height: 18, borderRadius: 5, border: "none",
                        background: i === 0 ? "transparent" : "rgba(91,94,244,0.08)",
                        color: i === 0 ? "var(--text-muted)" : "var(--accent-color)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: i === 0 ? "default" : "pointer",
                        opacity: i === 0 ? 0.3 : 1,
                        padding: 0
                      }}
                      title="Mover rotina para cima"
                    >
                      ▲
                    </button>
                    <button
                      onClick={(e) => moveTemplateDown(i, e)}
                      disabled={i === templates.length - 1}
                      style={{
                        width: 22, height: 18, borderRadius: 5, border: "none",
                        background: i === templates.length - 1 ? "transparent" : "rgba(91,94,244,0.08)",
                        color: i === templates.length - 1 ? "var(--text-muted)" : "var(--accent-color)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: i === templates.length - 1 ? "default" : "pointer",
                        opacity: i === templates.length - 1 ? 0.3 : 1,
                        padding: 0
                      }}
                      title="Mover rotina para baixo"
                    >
                      ▼
                    </button>
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
          ))}
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
