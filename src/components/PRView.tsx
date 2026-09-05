import { useMemo } from "react";
import { Trophy, TrendingUp, Dumbbell } from "lucide-react";
import type { PersonalRecord } from "../types";

interface PRViewProps {
  prs: PersonalRecord[];
}

export function PRView({ prs }: PRViewProps) {
  const allBest = useMemo(() => {
    const bestPerExercise: Record<string, PersonalRecord> = {};
    prs.forEach(pr => {
      const existing = bestPerExercise[pr.exerciseName];
      if (!existing || pr.estimated1RM > existing.estimated1RM) {
        bestPerExercise[pr.exerciseName] = pr;
      }
    });
    return Object.values(bestPerExercise).sort((a, b) => b.estimated1RM - a.estimated1RM);
  }, [prs]);

  if (prs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: 12, color: "var(--text-secondary)" }}>
        <Trophy size={48} style={{ opacity: 0.3 }} />
        <p style={{ fontWeight: 700, fontSize: "1rem" }}>Sem Records ainda</p>
        <p style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: 240 }}>Os teus records pessoais aparecem aqui depois de completares treinos.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Trophy size={16} color="#FF9500" />
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Exercícios</p>
          </div>
          <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{allBest.length}</p>
        </div>
        <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={16} color="var(--accent-color)" />
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Melhor 1RM</p>
          </div>
          <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {allBest.length > 0 ? `${allBest[0].estimated1RM.toFixed(0)}kg` : "—"}
          </p>
        </div>
      </div>

      {/* Records List */}
      <div style={{ background: "#fff", border: "1px solid var(--border-color)", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {allBest.map((pr, i) => (
          <div key={pr.id} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: i < allBest.length - 1 ? "1px solid var(--border-color)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: i === 0 ? "rgba(255,204,0,0.15)" : "rgba(91,94,244,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {i === 0
                  ? <Trophy size={18} color="#FFCC00" />
                  : <Dumbbell size={18} color="var(--accent-color)" />
                }
              </div>
              <div>
                <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{pr.exerciseName}</p>
                <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: 2 }}>
                  {pr.reps} reps · {new Date(pr.date).toLocaleDateString("pt-PT")}
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)" }}>{pr.weight} kg</p>
              <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>1RM ~{pr.estimated1RM.toFixed(0)} kg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

