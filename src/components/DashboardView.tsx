import { useMemo } from "react";
import { BarChart3, Flame, Dumbbell, Trophy, TrendingUp, Plus, ChevronRight, Sparkles } from "lucide-react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "10px" }}>
      {/* Greeting Header */}
      <div>
        <h2 style={{ fontSize: "1.55rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1.2 }}>
          {getGreeting(profile?.name || "Atleta")}
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px", textTransform: "capitalize" }}>
          {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Botão de Destaque Iniciar Treino */}
      <button
        onClick={onStartWorkout}
        style={{
          width: "100%",
          background: "var(--accent-gradient)",
          border: "none",
          borderRadius: "20px",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          boxShadow: "0 6px 24px var(--accent-glow)",
          transition: "transform var(--transition-fast)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", fontFamily: "var(--font-display)" }}>Iniciar Treino</p>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.78rem", marginTop: 2 }}>Registar novo treino ou rotina</p>
          </div>
        </div>
        <ChevronRight size={22} color="rgba(255,255,255,0.8)" />
      </button>

      {/* 3 Metric Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        {[
          { icon: <Dumbbell size={18} color="var(--accent-color)" />, val: stats.thisWeekCount, lbl: "Treinos" },
          { icon: <TrendingUp size={18} color="#34C759" />, val: `${(stats.totalVolume / 1000).toFixed(1)}t`, lbl: "Volume" },
          { icon: <Flame size={18} color="#FF9500" />, val: stats.streak, lbl: "Dias Seguidos" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 18, padding: "16px 8px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{s.icon}</div>
            <p style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{s.val}</p>
            <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.lbl}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de Barras Semanal */}
      <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 20, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={18} color="var(--accent-color)" />
            <p style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>Frequência Semanal</p>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--accent-color)", fontWeight: 700 }}>Esta Semana</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: 95, paddingTop: 10 }}>
          {weekDays.map((day, i) => {
            const count = stats.perDay[i];
            const barH = count > 0 ? Math.max(16, (count / maxBar) * 65) : 6;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: "100%",
                  height: 65,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}>
                  <div style={{
                    width: "100%",
                    height: barH,
                    borderRadius: 8,
                    background: count > 0
                      ? (day.isToday ? "var(--accent-gradient)" : "#C7C8FC")
                      : "#F2F2F7",
                    boxShadow: count > 0 && day.isToday ? "0 2px 8px var(--accent-glow)" : "none",
                    transition: "height 0.4s ease",
                  }} />
                </div>
                <p style={{
                  fontSize: "0.65rem",
                  fontWeight: day.isToday ? 800 : 600,
                  color: day.isToday ? "var(--accent-color)" : "var(--text-secondary)",
                }}>{day.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Records Pessoais ou Sugestão de Rotinas */}
      {recentPRs.length > 0 ? (
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 20, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={18} color="#FF9500" />
              <p style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--text-primary)" }}>Últimos Records (PRs)</p>
            </div>
            <button onClick={() => onNavigate("prs")} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 2 }}>
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          {recentPRs.map((pr, i) => (
            <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: i > 0 ? 12 : 0, marginTop: i > 0 ? 12 : 0, borderTop: i > 0 ? "1px solid var(--border-color)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,149,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={18} color="#FF9500" />
                </div>
                <div>
                  <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{pr.exerciseName}</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 1 }}>{new Date(pr.date).toLocaleDateString("pt-PT")}</p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>{pr.weight} kg</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{pr.reps} reps</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div 
          onClick={() => onNavigate("workout")}
          className="interactive"
          style={{ 
            background: "#fff", 
            border: "1px solid var(--border-color)", 
            borderRadius: 20, 
            padding: "18px 20px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            cursor: "pointer"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: "rgba(91,94,244,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} color="var(--accent-color)" />
            </div>
            <div>
              <p style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)" }}>Supera os teus Limites</p>
              <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: 2 }}>Conclui o teu primeiro treino para bater recordes!</p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </div>
      )}
    </div>
  );
}
