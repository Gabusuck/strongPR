import { useMemo } from "react";
import { Play, Plus, Flame, Trophy, Calendar, Dumbbell, ChevronRight, RotateCcw, CheckCircle2 } from "lucide-react";
import type { Workout, PersonalRecord, UserProfile, WorkoutTemplate } from "../types";

interface DashboardViewProps {
  workouts: Workout[];
  prs: PersonalRecord[];
  profile: UserProfile;
  templates: WorkoutTemplate[];
  onStartWorkout: () => void;
  onStartWorkoutFromTemplate: (template: WorkoutTemplate) => void;
  onNavigate: (tab: string) => void;
}

const DEFAULT_STARTER_ROUTINES: WorkoutTemplate[] = [
  {
    id: "starter-push",
    name: "Treino A — Push (Peito & Ombros)",
    exercises: [
      { id: "EIeI8Vf", name: "Supino Reto com Barra", category: "Peito", sets: [{ id: "s1", weight: 60, reps: 10, isCompleted: false }, { id: "s2", weight: 60, reps: 10, isCompleted: false }, { id: "s3", weight: 60, reps: 8, isCompleted: false }] },
      { id: "3TZduzM", name: "Supino Inclinado", category: "Peito", sets: [{ id: "s4", weight: 50, reps: 10, isCompleted: false }, { id: "s5", weight: 50, reps: 10, isCompleted: false }] },
      { id: "wdRZISl", name: "Desenvolvimento Militar", category: "Ombros", sets: [{ id: "s6", weight: 40, reps: 10, isCompleted: false }] },
    ]
  },
  {
    id: "starter-pull",
    name: "Treino B — Pull (Costas & Bíceps)",
    exercises: [
      { id: "lBDjFxJ", name: "Elevações (Pull-ups)", category: "Costas", sets: [{ id: "s10", weight: 0, reps: 8, isCompleted: false }, { id: "s11", weight: 0, reps: 8, isCompleted: false }] },
      { id: "eZyBC3j", name: "Remada Curvada com Barra", category: "Costas", sets: [{ id: "s12", weight: 50, reps: 10, isCompleted: false }] },
      { id: "ila4NZS", name: "Levantamento Terra (Deadlift)", category: "Costas", sets: [{ id: "s14", weight: 80, reps: 6, isCompleted: false }] },
    ]
  },
  {
    id: "starter-legs",
    name: "Treino C — Legs (Pernas & Core)",
    exercises: [
      { id: "qXTaZnJ", name: "Agachamento com Barra", category: "Pernas", sets: [{ id: "s18", weight: 70, reps: 10, isCompleted: false }, { id: "s19", weight: 70, reps: 10, isCompleted: false }] },
      { id: "10Z2DXU", name: "Prensa 45° (Leg Press)", category: "Pernas", sets: [{ id: "s21", weight: 120, reps: 12, isCompleted: false }] },
    ]
  }
];

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bom dia, ${name}!`;
  if (h < 18) return `Boa tarde, ${name}!`;
  return `Boa noite, ${name}!`;
}

function getWeekDays() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return days.map((label, i) => ({
    label,
    isToday: i === todayIdx,
    dayNum: new Date(today.getTime() - (todayIdx - i) * 86400000).getDate()
  }));
}

export function DashboardView({ workouts, prs, profile, templates, onStartWorkout, onStartWorkoutFromTemplate, onNavigate }: DashboardViewProps) {
  const activeRoutines = templates.length > 0 ? templates : DEFAULT_STARTER_ROUTINES;

  // Compute weekly workouts and streak
  const { weekDaysTrained, thisWeekCount, streak, lastWorkout } = useMemo(() => {
    const now = new Date();
    const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - todayIdx);
    weekStart.setHours(0, 0, 0, 0);

    const weekDaysTrained = Array(7).fill(false);
    let count = 0;

    workouts.forEach(w => {
      const d = new Date(w.date);
      if (d >= weekStart) {
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        weekDaysTrained[idx] = true;
        count++;
      }
    });

    // Compute streak
    let streak = 0;
    const sorted = [...workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    for (const w of sorted) {
      const d = new Date(w.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((check.getTime() - d.getTime()) / 86400000);
      if (diff === 0 || diff === streak) {
        streak = diff + 1;
        check.setDate(check.getDate() - 1);
      } else break;
    }

    return {
      weekDaysTrained,
      thisWeekCount: count,
      streak,
      lastWorkout: sorted.length > 0 ? sorted[0] : null
    };
  }, [workouts]);

  // Next suggested routine to perform (smart rotation)
  const nextRoutine = useMemo(() => {
    if (activeRoutines.length === 0) return null;
    if (!lastWorkout || !lastWorkout.templateId) return activeRoutines[0];
    const lastIdx = activeRoutines.findIndex(r => r.id === lastWorkout.templateId);
    if (lastIdx === -1 || lastIdx === activeRoutines.length - 1) return activeRoutines[0];
    return activeRoutines[lastIdx + 1];
  }, [activeRoutines, lastWorkout]);

  const recentPRs = prs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const weekDays = getWeekDays();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      
      {/* 1. TOPO: Saudação & Resumo de Streak */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {getGreeting(profile?.name || "Atleta")}
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Pronto para o treino de hoje?
          </p>
        </div>

        {/* Streak Badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#FFF4E5",
          border: "1px solid #FFE2B8",
          padding: "8px 14px",
          borderRadius: "20px",
          color: "#D97706",
          fontWeight: 800,
          fontSize: "0.85rem"
        }}>
          <Flame size={18} color="#FF9500" fill="#FF9500" />
          <span>{streak > 0 ? `${streak} dias` : "0 dias"}</span>
        </div>
      </div>

      {/* 2. CARD PRINCIPAL DE GINÁSIO: O Teu Próximo Treino (Destaque Maior) */}
      <div style={{
        background: "linear-gradient(135deg, #5B5EF4 0%, #7B7FF5 100%)",
        borderRadius: "26px",
        padding: "22px",
        color: "#ffffff",
        boxShadow: "0 10px 30px rgba(91, 94, 244, 0.35)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)", pointerEvents: "none" }} />
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.2)", padding: "4px 10px", borderRadius: "10px" }}>
            SUGESTÃO DE HOJE
          </span>
          <span style={{ fontSize: "0.75rem", opacity: 0.85, fontWeight: 600 }}>
            {nextRoutine ? `${nextRoutine.exercises.length} exercícios` : "Treino livre"}
          </span>
        </div>

        <h3 style={{ fontSize: "1.45rem", fontWeight: 800, fontFamily: "var(--font-display)", marginBottom: "8px" }}>
          {nextRoutine ? nextRoutine.name : "Treino Livre"}
        </h3>

        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.4, marginBottom: "20px" }}>
          {nextRoutine
            ? nextRoutine.exercises.map(e => e.name).slice(0, 3).join(" • ") + (nextRoutine.exercises.length > 3 ? "..." : "")
            : "Começa um treino limpo e adiciona os teus exercícios à medida que treinas."}
        </p>

        {/* Botão de Começar Imediatamente */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => nextRoutine ? onStartWorkoutFromTemplate(nextRoutine) : onStartWorkout()}
            style={{
              flex: 1,
              background: "#FFFFFF",
              color: "#5B5EF4",
              border: "none",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: 800,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.1)"
            }}
          >
            <Play size={18} fill="#5B5EF4" /> Começar Treino
          </button>
          
          <button
            onClick={onStartWorkout}
            style={{
              background: "rgba(255,255,255,0.18)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "16px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
            title="Treino em Branco"
          >
            + Vazio
          </button>
        </div>
      </div>

      {/* 3. CALENDÁRIO DA SEMANA ATUAL (Seg → Dom) */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: "22px",
        padding: "18px 16px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={16} color="var(--accent-color)" />
            <p style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-primary)" }}>Frequência Semanal</p>
          </div>
          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--accent-color)" }}>
            {thisWeekCount} de 5 treinos
          </span>
        </div>

        {/* Dias da semana */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "6px" }}>
          {weekDays.map((day, i) => {
            const trained = weekDaysTrained[i];
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "10px 4px",
                  borderRadius: "14px",
                  background: trained
                    ? "rgba(52, 199, 89, 0.12)"
                    : day.isToday
                    ? "rgba(91, 94, 244, 0.08)"
                    : "#F8F8FA",
                  border: day.isToday
                    ? "1.5px solid var(--accent-color)"
                    : trained
                    ? "1px solid rgba(52, 199, 89, 0.3)"
                    : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: day.isToday ? "var(--accent-color)" : "var(--text-secondary)" }}>
                  {day.label}
                </span>
                <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>
                  {day.dayNum}
                </span>
                <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {trained ? (
                    <CheckCircle2 size={16} color="#34C759" />
                  ) : (
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: day.isToday ? "var(--accent-color)" : "#D1D1D6" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. AS TUAS ROTINAS (Cartões Diretos com 1 Toque para Treinar) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 4px" }}>
          <p style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
            As Tuas Rotinas
          </p>
          <button onClick={() => onNavigate("routines")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
            Todas ({activeRoutines.length}) <ChevronRight size={14} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {activeRoutines.map((routine, idx) => {
            const colors = ["#5B5EF4", "#00B2FE", "#00C6AE", "#FF9500"];
            const accent = colors[idx % colors.length];
            return (
              <div
                key={routine.id}
                onClick={() => onStartWorkoutFromTemplate(routine)}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border-color)",
                  borderRadius: "18px",
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  cursor: "pointer",
                  transition: "transform var(--transition-fast)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: "14px",
                    background: `${accent}15`,
                    color: accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800
                  }}>
                    <Dumbbell size={20} color={accent} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {routine.name}
                    </h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {routine.exercises.length} exercícios configurados
                    </p>
                  </div>
                </div>

                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: "12px",
                  background: "var(--accent-gradient)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px var(--accent-glow)"
                }}>
                  <Play size={16} color="#fff" fill="#fff" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. ÚLTIMOS RECORDS PESSOAIS (PRs) */}
      {recentPRs.length > 0 && (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "22px",
          padding: "18px 20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Trophy size={18} color="#FF9500" />
              <p style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>Recordes Pessoais Recentes</p>
            </div>
            <button onClick={() => onNavigate("prs")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
              Ver Todos <ChevronRight size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentPRs.map((pr, idx) => (
              <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? "1px solid var(--border-color)" : "none" }}>
                <div>
                  <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "1px" }}>
                    {pr.reps} reps · {new Date(pr.date).toLocaleDateString("pt-PT")}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {pr.weight} kg
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ÚLTIMO TREINO CONCLUÍDO (Com botão de Repetir) */}
      {lastWorkout && (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "22px",
          padding: "18px 20px",
          border: "1px solid var(--border-color)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-secondary)" }}>
              ÚLTIMA SESSÃO
            </p>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {new Date(lastWorkout.date).toLocaleDateString("pt-PT")}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {lastWorkout.name}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {lastWorkout.exercises.length} exercícios concluídos
              </p>
            </div>

            <button
              onClick={() => {
                onStartWorkoutFromTemplate({
                  id: lastWorkout.id,
                  name: lastWorkout.name,
                  exercises: lastWorkout.exercises.map(e => ({
                    ...e,
                    sets: e.sets.map(s => ({ ...s, isCompleted: false }))
                  }))
                });
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(91, 94, 244, 0.1)",
                color: "var(--accent-color)",
                border: "none",
                borderRadius: "12px",
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              <RotateCcw size={14} /> Repetir
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button + */}
      <button
        onClick={onStartWorkout}
        style={{
          position: "fixed",
          bottom: "98px",
          right: "20px",
          width: 54,
          height: 54,
          borderRadius: "18px",
          background: "linear-gradient(135deg, #5B5EF4 0%, #7B7FF5 100%)",
          border: "none",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(91, 94, 244, 0.45)",
          cursor: "pointer",
          zIndex: 998,
        }}
        aria-label="Adicionar Treino"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

    </div>
  );
}
