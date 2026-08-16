import React, { useState } from 'react';
import type { PersonalRecord, Exercise } from '../types';

import { Trophy, TrendingUp, Calendar, Plus, X, ArrowLeft } from 'lucide-react';

interface PRTrackerProps {
  prs: PersonalRecord[];
  exercises: Exercise[];
  onAddManualPR: (exerciseId: string, weight: number, reps: number, date: string) => void;
}

export const PRTracker: React.FC<PRTrackerProps> = ({
  prs,
  exercises,
  onAddManualPR,
}) => {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showAddManualPRModal, setShowAddManualPRModal] = useState(false);
  
  // State for manual PR form
  const [formExerciseId, setFormExerciseId] = useState(exercises[0]?.id || '');
  const [formWeight, setFormWeight] = useState('');
  const [formReps, setFormReps] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);

  // Group PRs by exercise and get the best PR for each exercise
  // A PR is considered "the best" based on its weight, and then reps.
  const getLatestPRsForExercises = () => {
    const exerciseBestMap: Record<string, PersonalRecord> = {};
    
    prs.forEach((pr) => {
      const currentBest = exerciseBestMap[pr.exerciseId];
      if (!currentBest || pr.weight > currentBest.weight || (pr.weight === currentBest.weight && pr.reps > currentBest.reps)) {
        exerciseBestMap[pr.exerciseId] = pr;
      }
    });

    return Object.values(exerciseBestMap);
  };

  const bestPRs = getLatestPRsForExercises();

  // Find exercise details
  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  
  // Find all PRs for the selected exercise, sorted by date (ascending for chart, descending for list)
  const exercisePRs = prs
    .filter((pr) => pr.exerciseId === selectedExerciseId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const exercisePRsDescending = [...exercisePRs].reverse();

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formExerciseId || !formWeight || !formReps) return;

    onAddManualPR(
      formExerciseId,
      parseFloat(formWeight),
      parseInt(formReps, 10),
      new Date(formDate).toISOString()
    );

    setShowAddManualPRModal(false);
    setFormWeight('');
    setFormReps('');
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // SVG Chart generator logic
  const renderSVGChart = (history: PersonalRecord[]) => {
    if (history.length < 2) {
      return (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
          Precisas de pelo menos 2 recordes gravados neste exercício para gerar o gráfico de progresso.
        </div>
      );
    }

    const padding = 30;
    const width = 380;
    const height = 150;

    const weights = history.map((h) => h.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    
    // Spread range to prevent division by zero when min == max
    const weightRange = maxWeight === minWeight ? 10 : (maxWeight - minWeight);
    const yMin = Math.max(0, minWeight - weightRange * 0.15);
    const yMax = maxWeight + weightRange * 0.15;
    const yRange = yMax - yMin;

    const points = history.map((pr, index) => {
      const x = padding + (index / (history.length - 1)) * (width - padding * 2);
      // In SVG, Y coordinate 0 is at the top, so we invert
      const y = height - padding - ((pr.weight - yMin) / yRange) * (height - padding * 2);
      return { x, y, data: pr };
    });

    // Create polyline string
    const linePath = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={14} style={{ color: 'var(--accent)' }} />
          Curva de Evolução (Peso Máximo)
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {/* Grid lines (horizontal) */}
          {[0.25, 0.5, 0.75].map((ratio, i) => {
            const y = padding + ratio * (height - padding * 2);
            const wVal = Math.round((yMax - ratio * yRange) * 10) / 10;
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid" />
                <text x={padding - 5} y={y + 3} textAnchor="end" className="chart-text">{wVal}kg</text>
              </g>
            );
          })}
          
          {/* Main Trend Line */}
          <polyline points={linePath} className="chart-line" />

          {/* Dots on points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" className="chart-points" />
              <circle cx={p.x} cy={p.y} r="2" fill="var(--accent)" />
              {/* Tooltip text on top of points (showing last, first and max) */}
              {(idx === 0 || idx === points.length - 1 || p.data.weight === maxWeight) && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">
                  {p.data.weight}kg
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Conditionally render detailed view OR main list */}
      {selectedExerciseId && selectedExercise ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Detail Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setSelectedExerciseId(null)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selectedExercise.name}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Histórico de recordes • {selectedExercise.category}
              </span>
            </div>
          </div>

          {/* Chart */}
          {renderSVGChart(exercisePRs)}

          {/* PR History List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Historial de Marcas</h3>
            
            {exercisePRsDescending.map((pr, index) => (
              <div 
                key={pr.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {index === 0 && (
                    <span className="pr-badge">Atual 👑</span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    {formatDate(pr.date)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
                    {pr.weight} kg
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '6px' }}>
                    × {pr.reps} rep
                  </span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    1RM Est: {pr.estimated1RM} kg
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      ) : (
        // MAIN LIST OF EXERCISES WITH PRS
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recordes Pessoais (PRs)</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Os teus melhores pesos registados por exercício.
              </p>
            </div>
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => {
                if(exercises.length > 0) {
                  setFormExerciseId(exercises[0].id);
                }
                setShowAddManualPRModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={16} /> Registar Manual
            </button>
          </div>

          {bestPRs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bestPRs.map((pr) => (
                <div 
                  key={pr.id}
                  className="glass-card interactive"
                  onClick={() => setSelectedExerciseId(pr.exerciseId)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    cursor: 'pointer',
                    marginBottom: 0
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {pr.exerciseName}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      🏆 {formatDate(pr.date)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {pr.weight} kg <Trophy size={16} fill="#eab308" />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {pr.reps} reps • 1RM Est: {pr.estimated1RM} kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '0.85rem' }}>
              Ainda não tens nenhum recorde pessoal registado. Conclui treinos na aba "Treino" para obteres PRs automaticamente!
            </div>
          )}

        </div>
      )}

      {/* Manual PR Entry Modal */}
      {showAddManualPRModal && (
        <div className="modal-overlay" onClick={() => setShowAddManualPRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Registar PR Manual</h3>
              <button 
                onClick={() => setShowAddManualPRModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Exercício</label>
                <select
                  className="form-input"
                  value={formExerciseId}
                  onChange={(e) => setFormExerciseId(e.target.value)}
                  style={{ background: 'var(--bg-primary)' }}
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Peso Máximo (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className="form-input"
                    placeholder="ex: 80"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Repetições</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="ex: 5"
                    value={formReps}
                    onChange={(e) => setFormReps(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Data do Recorde</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Adicionar Recorde
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
