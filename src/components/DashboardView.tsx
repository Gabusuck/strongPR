import { useMemo } from "react";
import { BarChart3, Flame, Dumbbell, Trophy, TrendingUp, Plus, ChevronRight } from "lucide-react";
import type { Workout, PersonalRecord, UserProfile } from "../types";

interface DashboardViewProps {
  workouts: Workout[];
  prs: PersonalRecord[];
  profile: UserProfile;
  onStartWorkout: () => void;
  onNavigate: (tab: string) => void;
}

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bom dia, ${name} 👋`;
  if (h < 18) return `Boa tarde, ${name} 👋`;
  return `Boa noite, ${name} 👋`;
}

function getWeekDays() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Map Sunday=0 to index 6
  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return days.map((label, i) => ({ label, isToday: i === todayIdx }));
}

export function DashboardView({ workouts, prs, profile, onStartWorkout, onNavigate }: DashboardViewProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const thisWeek = workouts.filter(w => new Date(w.date) >= weekAgo);

    const totalVolume = thisWeek.reduce((acc, w) => {
      return acc + w.exercises.reduce((ea, ex) => {
        return ea + ex.sets.filter(s => s.isCompleted).reduce((sa, s) => sa + s.weight * s.reps, 0);
      }, 0);
    }, 0);

    // Streak
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

    // Workouts per day of week (0=Mon..6=Sun) for current week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    weekStart.setHours(0, 0, 0, 0);
    const perDay = Array(7).fill(0);
    workouts.forEach(w => {
      const d = new Date(w.date);
      if (d >= weekStart) {
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        perDay[idx]++;
      }
    });

    return {
      thisWeekCount: thisWeek.length,
      totalVolume: Math.round(totalVolume),
      streak,
      perDay,
    };
  }, [workouts]);

  const recentPRs = prs.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  const weekDays = getWeekDays();
  const maxBar = Math.max(...stats.perDay, 1);

  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1.2 }}>
          {getGreeting(profile?.name || "Atleta")}
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Botão iniciar treino — estilo botao + Money Manager */}
      <button
        onClick={onStartWorkout}
        style={{
          width: "100%",
          background: "var(--accent-gradient)",
          border: "none",
          borderRadius: "16px",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          marginBottom: "16px",
          boxShadow: "0 4px 20px var(--accent-glow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={24} color="#fff" />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: "var(--font-display)" }}>Iniciar Treino</p>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", marginTop: 2 }}>Treino em branco ou por rotina</p>
          </div>
        </div>
        <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
      </button>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        {[
          { icon: <Dumbbell size={18} color="var(--accent-color)" />, val: stats.thisWeekCount, lbl: "Esta semana" },
          { icon: <TrendingUp size={18} color="#34C759" />, val: `${(stats.totalVolume / 1000).toFixed(1)}t`, lbl: "Volume kg" },
          { icon: <Flame size={18} color="#FF9500" />, val: stats.streak, lbl: "Dias streak" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: "14px 10px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{s.icon}</div>
            <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1 }}>{s.val}</p>
            <p style={{ fontSize: "0.62rem", color: "var(--text-secondary)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de barras semanal */}
      <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: "18px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <BarChart3 size={18} color="var(--accent-color)" />
          <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>Treinos esta semana</p>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: 80 }}>
          {weekDays.map((day, i) => {
            const count = stats.perDay[i];
            const barH = count > 0 ? Math.max(14, (count / maxBar) * 70) : 0;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: "100%",
                  height: 70,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}>
                  <div style={{
                    width: "100%",
                    height: barH || 4,
                    borderRadius: 6,
                    background: count > 0
                      ? (day.isToday ? "var(--accent-color)" : "#C7C8FC")
                      : "#F2F2F7",
                    transition: "height 0.4s ease",
                  }} />
                </div>
                <p style={{
                  fontSize: "0.6rem",
                  fontWeight: day.isToday ? 800 : 600,
                  color: day.isToday ? "var(--accent-color)" : "var(--text-secondary)",
                }}>{day.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimos PRs */}
      {recentPRs.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: "18px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} color="#FF9500" />
              <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-primary)" }}>Últimos Records</p>
            </div>
            <button onClick={() => onNavigate("prs")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          {recentPRs.map((pr, i) => (
            <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,149,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={16} color="#FF9500" />
                </div>
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 1 }}>{new Date(pr.date).toLocaleDateString("pt-PT")}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)" }}>{pr.weight} kg</p>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{pr.reps} reps</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {workouts.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--text-secondary)" }}>
          <Dumbbell size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>Sem treinos ainda</p>
          <p style={{ fontSize: "0.82rem", marginTop: 4 }}>Começa o teu primeiro treino acima!</p>
        </div>
      )}
    </div>
  );
}
