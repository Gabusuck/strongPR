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

  // Group PRs by exercise and get the best PR for each
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

  // SVG Area Chart generator logic (Gradient Area Chart)
  const renderSVGChart = (history: PersonalRecord[]) => {
    if (history.length < 2) {
      return (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem', border: '1px dashed var(--border-color)', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
          ⚠️ Precisas de pelo menos 2 recordes gravados neste exercício para gerar o gráfico de progresso.
        </div>
      );
    }

    const paddingX = 40;
    const paddingY = 25;
    const width = 380;
    const height = 160;

    const weights = history.map((h) => h.weight);
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    
    const weightRange = maxWeight === minWeight ? 10 : (maxWeight - minWeight);
    const yMin = Math.max(0, minWeight - weightRange * 0.2);
    const yMax = maxWeight + weightRange * 0.2;
    const yRange = yMax - yMin;

    const points = history.map((pr, index) => {
      const x = paddingX + (index / (history.length - 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((pr.weight - yMin) / yRange) * (height - paddingY * 2);
      return { x, y, data: pr };
    });

    // Create stroke path string
    const strokeD = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
    
    // Create fill path (closed down to Y-axis base)
    const fillD = `${strokeD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} style={{ color: 'var(--accent-color)' }} />
          Curva de Evolução de Carga
        </div>
        
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
          <defs>
            {/* Area Gradient fill */}
            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-color)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent-color)" stopOpacity="0.0" />
            </linearGradient>
            
            {/* Glow filter for the stroke path */}
            <filter id="stroke-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Horizontal Grid lines */}
          {[0.2, 0.5, 0.8].map((ratio, i) => {
            const y = paddingY + ratio * (height - paddingY * 2);
            const wVal = Math.round((yMax - ratio * yRange) * 10) / 10;
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} className="chart-grid" />
                <text x={paddingX - 8} y={y + 3} textAnchor="end" className="chart-text" style={{ fontSize: '8px', fill: 'var(--text-secondary)' }}>{wVal}kg</text>
              </g>
            );
          })}
          
          {/* Gradient Area Fill */}
          <path d={fillD} fill="url(#area-grad)" />

          {/* Glowing Stroke Line */}
          <path d={strokeD} fill="none" stroke="var(--accent-color)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#stroke-glow)" />

          {/* Dots on points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="6" fill="var(--bg-primary)" stroke="var(--accent-color)" strokeWidth="3" />
              <circle cx={p.x} cy={p.y} r="2" fill="var(--accent-color)" />
              {/* Tooltip text showing values */}
              {(idx === 0 || idx === points.length - 1 || p.data.weight === maxWeight) && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" fontFamily="var(--font-display)">
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
      
      {selectedExerciseId && selectedExercise ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Detail Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => setSelectedExerciseId(null)}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{selectedExercise.name}</h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                Evolução • {selectedExercise.category}
              </span>
            </div>
          </div>

          {/* Chart */}
          {renderSVGChart(exercisePRs)}

          {/* PR History List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Historial de Marcas</h3>
            
            {exercisePRsDescending.map((pr, index) => (
              <div 
                key={pr.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {index === 0 && (
                    <span className="pr-badge">Coroa 👑</span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    {formatDate(pr.date)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>
                    {pr.weight} kg
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginLeft: '6px', fontWeight: 600 }}>
                    × {pr.reps} reps
                  </span>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>
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
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Recordes Pessoais</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Acompanha as tuas melhores marcas por exercício.
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
              <Plus size={16} /> Registar PR
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
                    padding: '18px 20px',
                    cursor: 'pointer',
                    marginBottom: 0
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      {pr.exerciseName}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontWeight: 500 }}>
                      🏆 {formatDate(pr.date)}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', fontFamily: 'var(--font-display)' }}>
                      {pr.weight} kg <Trophy size={18} fill="#f59e0b" style={{ color: '#f59e0b' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: 500 }}>
                      {pr.reps} reps • 1RM: {pr.estimated1RM} kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '20px', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
              Ainda não tens nenhum recorde pessoal registado. Completa séries no ecrã de treino para começares a bater recordes!
            </div>
          )}

        </div>
      )}

      {/* Manual PR Entry Modal */}
      {showAddManualPRModal && (
        <div className="modal-overlay" onClick={() => setShowAddManualPRModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Registar PR Manual</h3>
              <button 
                onClick={() => setShowAddManualPRModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exercício</label>
                <select
                  className="form-input"
                  value={formExerciseId}
                  onChange={(e) => setFormExerciseId(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.category})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Peso Máximo (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    className="form-input"
                    placeholder="ex: 80"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repetições</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="ex: 5"
                    value={formReps}
                    onChange={(e) => setFormReps(e.target.value)}
                    style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data do Recorde</label>
                <input
                  type="date"
                  required
                  className="form-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{ fontWeight: 600 }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '15px' }}>
                Adicionar Recorde
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
