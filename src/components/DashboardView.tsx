import { useMemo } from "react";
import { Bell, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Plus, ChevronRight, Play, RotateCcw } from "lucide-react";
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
    name: "Push (Peito / Ombros)",
    exercises: [
      { id: "EIeI8Vf", name: "Supino Reto com Barra", category: "Peito", sets: [{ id: "s1", weight: 60, reps: 10, isCompleted: false }, { id: "s2", weight: 60, reps: 10, isCompleted: false }, { id: "s3", weight: 60, reps: 8, isCompleted: false }] },
      { id: "3TZduzM", name: "Supino Inclinado", category: "Peito", sets: [{ id: "s4", weight: 50, reps: 10, isCompleted: false }, { id: "s5", weight: 50, reps: 10, isCompleted: false }] },
      { id: "wdRZISl", name: "Desenvolvimento Militar", category: "Ombros", sets: [{ id: "s6", weight: 40, reps: 10, isCompleted: false }] },
    ]
  },
  {
    id: "starter-pull",
    name: "Pull (Costas / Bíceps)",
    exercises: [
      { id: "lBDjFxJ", name: "Elevações (Pull-ups)", category: "Costas", sets: [{ id: "s10", weight: 0, reps: 8, isCompleted: false }, { id: "s11", weight: 0, reps: 8, isCompleted: false }] },
      { id: "eZyBC3j", name: "Remada Curvada", category: "Costas", sets: [{ id: "s12", weight: 50, reps: 10, isCompleted: false }] },
      { id: "ila4NZS", name: "Levantamento Terra (Deadlift)", category: "Costas", sets: [{ id: "s14", weight: 80, reps: 6, isCompleted: false }] },
    ]
  },
  {
    id: "starter-legs",
    name: "Legs (Pernas / Core)",
    exercises: [
      { id: "qXTaZnJ", name: "Agachamento com Barra", category: "Pernas", sets: [{ id: "s18", weight: 70, reps: 10, isCompleted: false }, { id: "s19", weight: 70, reps: 10, isCompleted: false }] },
      { id: "10Z2DXU", name: "Prensa de Pernas (Leg Press)", category: "Pernas", sets: [{ id: "s21", weight: 120, reps: 12, isCompleted: false }] },
    ]
  }
];

export function DashboardView({ workouts, templates, onStartWorkout, onStartWorkoutFromTemplate, onNavigate }: DashboardViewProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const thisWeek = workouts.filter(w => new Date(w.date) >= weekAgo);

    const totalVolume = workouts.reduce((acc, w) => {
      return acc + w.exercises.reduce((ea, ex) => {
        return ea + ex.sets.filter(s => s.isCompleted).reduce((sa, s) => sa + s.weight * s.reps, 0);
      }, 0);
    }, 0);

    const thisWeekVolume = thisWeek.reduce((acc, w) => {
      return acc + w.exercises.reduce((ea, ex) => {
        return ea + ex.sets.filter(s => s.isCompleted).reduce((sa, s) => sa + s.weight * s.reps, 0);
      }, 0);
    }, 0);

    // Calculate upper body vs lower body percentage
    let upperVol = 0;
    let lowerVol = 0;
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        const cat = ex.category?.toLowerCase() || "";
        const vol = ex.sets.filter(s => s.isCompleted).reduce((s, set) => s + set.weight * set.reps, 0);
        if (cat.includes("perna") || cat.includes("quad") || cat.includes("glút") || cat.includes("femoral") || cat.includes("gémeo")) {
          lowerVol += vol;
        } else {
          upperVol += vol;
        }
      });
    });

    const totMuscle = upperVol + lowerVol;
    const upperPct = totMuscle > 0 ? Math.round((upperVol / totMuscle) * 100) : 60;
    const lowerPct = totMuscle > 0 ? 100 - upperPct : 40;

    return {
      totalVolume: Math.round(totalVolume),
      thisWeekVolume: Math.round(thisWeekVolume),
      thisWeekCount: thisWeek.length,
      totalCount: workouts.length,
      upperPct,
      lowerPct,
    };
  }, [workouts]);

  const activeRoutines = templates.length > 0 ? templates : DEFAULT_STARTER_ROUTINES;
  const recentWorkouts = workouts.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      
      {/* 1. HERO GRADIENT CARD — Estilo All My Money */}
      <div style={{
        background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)",
        borderRadius: "28px",
        padding: "24px 22px 22px 22px",
        color: "#ffffff",
        boxShadow: "0 12px 36px rgba(79, 70, 229, 0.32)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, right: 40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
              VOLUME TOTAL LEVANTADO
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
              <span style={{ fontSize: "2.3rem", fontWeight: 800, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                {stats.totalVolume > 0 ? `${stats.totalVolume.toLocaleString("pt-PT")}` : "0"}
              </span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, opacity: 0.9 }}>kg</span>
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bell size={18} color="#fff" />
          </div>
        </div>

        {/* 2 Sub-boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.16)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "12px 14px" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.8)" }}>ESTA SEMANA</p>
            <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "2px" }}>
              +{stats.thisWeekVolume.toLocaleString("pt-PT")} kg
            </p>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.16)", backdropFilter: "blur(12px)", borderRadius: "16px", padding: "12px 14px" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.8)" }}>TREINOS</p>
            <p style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "2px" }}>
              {stats.thisWeekCount} sessões
            </p>
          </div>
        </div>
      </div>

      {/* 2. ACTION BUTTONS ROW */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={onStartWorkout}
          style={{
            flex: 1,
            background: "#FFF1F0",
            border: "1px solid #FFE2E0",
            borderRadius: "18px",
            padding: "15px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            color: "#FF3B30",
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(255, 59, 48, 0.06)",
          }}
        >
          <ArrowDownRight size={18} strokeWidth={2.5} /> Iniciar Treino
        </button>

        <button
          onClick={() => onNavigate("routines")}
          style={{
            width: 48,
            height: 48,
            borderRadius: "16px",
            background: "#FFFFFF",
            border: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-primary)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            flexShrink: 0
          }}
          title="Ver Rotinas"
        >
          <ArrowLeftRight size={18} strokeWidth={2} />
        </button>

        <button
          onClick={() => onNavigate("prs")}
          style={{
            flex: 1,
            background: "#EDFAF0",
            border: "1px solid #D5F5DC",
            borderRadius: "18px",
            padding: "15px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            color: "#34C759",
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(52, 199, 89, 0.06)",
          }}
        >
          <ArrowUpRight size={18} strokeWidth={2.5} /> Ver Records
        </button>
      </div>

      {/* 3. HORIZONTAL CARDS ROW — As Minhas Rotinas (Interativo!) */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 2px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            AS MINHAS ROTINAS
          </p>
          <button onClick={() => onNavigate("routines")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
            GERIR ROTINAS →
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
          {activeRoutines.map((routine, idx) => {
            const badgeColor = idx % 3 === 0 ? "#5B5EF4" : idx % 3 === 1 ? "#00B2FE" : "#00C6AE";
            return (
              <div
                key={routine.id}
                onClick={() => onStartWorkoutFromTemplate(routine)}
                style={{
                  minWidth: "150px",
                  flex: 1,
                  background: "#FFFFFF",
                  borderRadius: "18px",
                  padding: "16px 14px",
                  border: "1px solid var(--border-color)",
                  borderTop: `3px solid ${badgeColor}`,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "8px", background: badgeColor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.78rem" }}>
                    {routine.name.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {routine.name}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                    {routine.exercises.length} exercícios
                  </span>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(91,94,244,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Play size={12} color="var(--accent-color)" fill="var(--accent-color)" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. DONUT CHART CARD — Distribuição do Treino */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: "24px",
        padding: "22px 20px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        position: "relative"
      }}>
        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            DISTRIBUIÇÃO DO TREINO
          </p>
          <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Frequência e volume corporal
          </p>
        </div>

        {/* SVG Donut Chart */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative", height: 170 }}>
          <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="85" cy="85" r="62" fill="none" stroke="#F2F2F7" strokeWidth="18" />
            
            {/* Orange Segment */}
            <circle
              cx="85" cy="85" r="62"
              fill="none"
              stroke="#FF9500"
              strokeWidth="18"
              strokeDasharray="390"
              strokeDashoffset={390 - (390 * (stats.upperPct / 100))}
              strokeLinecap="round"
            />
            {/* Purple Segment */}
            <circle
              cx="85" cy="85" r="62"
              fill="none"
              stroke="#5B5EF4"
              strokeWidth="18"
              strokeDasharray="390"
              strokeDashoffset={390 - (390 * (stats.lowerPct / 100))}
              strokeLinecap="round"
            />
          </svg>

          {/* Center text inside Donut */}
          <div style={{ position: "absolute", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              TREINOS FEITOS
            </p>
            <p style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", marginTop: "2px" }}>
              {stats.thisWeekCount} / 5
            </p>
          </div>
        </div>

        {/* Breakdown Items */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFF5E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                💪
              </div>
              <div>
                <p style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>Membros Superiores</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Peito, Costas, Braços</p>
              </div>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{stats.upperPct}% do total</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                🦵
              </div>
              <div>
                <p style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>Membros Inferiores</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pernas, Core</p>
              </div>
            </div>
            <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{stats.lowerPct}% do total</p>
          </div>
        </div>
      </div>

      {/* 5. HISTÓRICO DE TREINOS RECENTES COM BOTÃO DE REPETIR TREINO */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: "24px",
        padding: "20px",
        border: "1px solid var(--border-color)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            ÚLTIMAS ATIVIDADES
          </p>
          <button onClick={() => onNavigate("history")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
            Histórico <ChevronRight size={14} />
          </button>
        </div>

        {recentWorkouts.length === 0 ? (
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
            Ainda não tens treinos registados. Toca em Iniciar Treino!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentWorkouts.map((w, idx) => (
              <div key={w.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? "1px solid var(--border-color)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EEF0FF", color: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.78rem" }}>
                    🏋️‍♂️
                  </div>
                  <div>
                    <p style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-primary)" }}>{w.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{new Date(w.date).toLocaleDateString("pt-PT")}</p>
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {w.exercises.length} ex.
                  </p>
                  <button
                    onClick={() => {
                      onStartWorkoutFromTemplate({
                        id: w.id,
                        name: w.name,
                        exercises: w.exercises.map(e => ({
                          ...e,
                          sets: e.sets.map(s => ({ ...s, isCompleted: false }))
                        }))
                      });
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "8px",
                      background: "#F2F2F7",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                    title="Repetir Treino"
                  >
                    <RotateCcw size={14} color="var(--accent-color)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button + */}
      <button
        onClick={onStartWorkout}
        style={{
          position: "fixed",
          bottom: "90px",
          right: "20px",
          width: 52,
          height: 52,
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
        <Plus size={26} strokeWidth={2.5} />
      </button>

    </div>
  );
}
