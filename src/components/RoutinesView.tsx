import { useState } from "react";
import { LayoutTemplate, Play, Trash2, Plus, Dumbbell } from "lucide-react";
import type { WorkoutTemplate, WorkoutExercise, Exercise } from "../types";

interface RoutinesViewProps {
  templates: WorkoutTemplate[];
  exercises: Exercise[];
  onStartWorkoutFromTemplate: (template: WorkoutTemplate) => void;
  onAddTemplate: (name: string, exercises: WorkoutExercise[]) => void;
  onDeleteTemplate: (id: string) => void;
}

export function RoutinesView({ templates, onStartWorkoutFromTemplate, onAddTemplate, onDeleteTemplate }: RoutinesViewProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    onAddTemplate(newName.trim(), []);
    setNewName("");
    setShowCreate(false);
  };

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

      {/* Create form inline */}
      {showCreate && (
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)", marginBottom: 10 }}>Nova Rotina</p>
          <input
            className="form-input"
            placeholder="Nome da rotina (ex: Push Day)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            autoFocus
            style={{ marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-small" style={{ flex: 1 }} onClick={handleCreate}>Criar</button>
            <button className="btn btn-secondary btn-small" style={{ flex: 1 }} onClick={() => { setShowCreate(false); setNewName(""); }}>Cancelar</button>
          </div>
        </div>
      )}

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
            <div key={template.id} style={{
              borderBottom: i < templates.length - 1 ? "1px solid var(--border-color)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", padding: "14px 18px", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(91,94,244,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <LayoutTemplate size={18} color="var(--accent-color)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    {template.exercises.length > 0
                      ? template.exercises.map(e => e.name).join(" · ")
                      : "Sem exercícios"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onStartWorkoutFromTemplate(template)}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "var(--accent-gradient)",
                      border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Play size={16} color="#fff" fill="#fff" />
                  </button>
                  <button
                    onClick={() => {
                      window.customConfirm("Eliminar Rotina", `Eliminar "${template.name}"?`, () => onDeleteTemplate(template.id));
                    }}
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
                Cria rotinas como "Push Day", "Pull Day" ou "Pernas" para iniciar treinos rapidamente com os teus exercícios favoritos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
