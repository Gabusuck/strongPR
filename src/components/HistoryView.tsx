import React, { useState } from 'react';
import type { Workout } from '../types';
import { Trash2, Calendar, Clock, ChevronDown, ChevronUp, Dumbbell, Award, TrendingUp } from 'lucide-react';

interface HistoryViewProps {
  workouts: Workout[];
  onDeleteWorkout: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  workouts,
  onDeleteWorkout,
}) => {
  // Store expanded workout IDs for list details
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  
  // Selected workout ID for the muscle scanner ('geral' or workout ID)
  const [selectedScanId, setSelectedScanId] = useState<string | 'geral'>('geral');

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
    // Clicking a workout list item also updates the scanner to focus on that workout!
    setSelectedScanId(expandedWorkoutId === id ? 'geral' : id);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    if (mins === 0) return 'Menos de 1 min';
    return `${mins} min`;
  };

  // Helper to calculate total volume of a workout
  const getWorkoutVolume = (workout: Workout) => {
    return workout.exercises.reduce((accEx, ex) => {
      const exVol = ex.sets.reduce((accSet, set) => {
        if (set.isCompleted) {
          return accSet + (set.weight * set.reps);
        }
        return accSet;
      }, 0);
      return accEx + exVol;
    }, 0);
  };

  // Helper to get muscles trained in a workout
  const getWorkoutMuscles = (workout: Workout) => {
    const muscles = new Set<string>();
    workout.exercises.forEach(ex => {
      if (ex.category) {
        muscles.add(ex.category);
      }
    });
    return Array.from(muscles);
  };

  // Helper to get overall muscles trained
  const getOverallMuscles = () => {
    const muscles = new Set<string>();
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.category) {
          muscles.add(ex.category);
        }
      });
    });
    return Array.from(muscles);
  };

  // Sort workouts newest first
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Active muscles to highlight in the anatomical map
  let activeMuscles: string[] = [];
  if (selectedScanId === 'geral') {
    activeMuscles = getOverallMuscles();
  } else {
    const matchedWorkout = workouts.find(w => w.id === selectedScanId);
    activeMuscles = matchedWorkout ? getWorkoutMuscles(matchedWorkout) : [];
  }

  // Calculate overall dashboard statistics
  const totalWorkouts = workouts.length;
  const totalVolumeAllTime = workouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
  const avgVolumePerWorkout = totalWorkouts > 0 ? Math.round(totalVolumeAllTime / totalWorkouts) : 0;

  // Determine fill color for muscles based on active states
  const getMuscleColor = (muscleGroup: string) => {
    const isActive = activeMuscles.includes(muscleGroup);
    return isActive ? 'url(#muscleGlow)' : '#e2e8f0';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Estatísticas & Histórico</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Analisa o teu progresso, volume de carga e músculos exercitados.
        </p>
      </div>

      {/* ANATOMICAL SCANNER CARD */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        
        {/* Hologram Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: 'var(--accent-color)' }} />
            Scanner de Músculos Ativos
          </h3>
          <span 
            style={{ 
              fontSize: '0.65rem', 
              color: 'var(--accent-color)', 
              fontWeight: 800, 
              backgroundColor: 'rgba(255, 94, 58, 0.08)', 
              padding: '2px 8px', 
              borderRadius: '10px',
              border: '1px solid rgba(255, 94, 58, 0.15)' 
            }}
          >
            {selectedScanId === 'geral' ? 'Scanner Geral' : 'Scanner de Treino'}
          </span>
        </div>

        {/* Anatomical Map SVG (Muscular front & back) */}
        <div style={{ padding: '10px 0', background: 'rgba(15, 23, 42, 0.01)', borderRadius: '16px', border: '1px solid rgba(15, 23, 42, 0.02)' }}>
          <svg viewBox="0 0 240 170" width="100%" height="auto" style={{ display: 'block', margin: '0 auto', maxWidth: '280px' }}>
            <defs>
              <linearGradient id="muscleGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff5e3a" />
                <stop offset="100%" stopColor="#ff8a00" />
              </linearGradient>
            </defs>

            {/* GROUND SHADOW */}
            <ellipse cx="60" cy="155" rx="35" ry="3.5" fill="rgba(15, 23, 42, 0.03)" />
            <ellipse cx="180" cy="155" rx="35" ry="3.5" fill="rgba(15, 23, 42, 0.03)" />

            {/* ================= FRONT VIEW (x=60) ================= */}
            {/* Head & Neck */}
            <rect x="57" y="16" width="6" height="8" rx="2" fill="#cbd5e1" />
            <circle cx="60" cy="10" r="7.5" fill="#cbd5e1" />

            {/* Shoulders (Ombros) */}
            <path d="M 43 23 C 38 25, 36 29, 37 33 L 44 30 Z" fill={getMuscleColor('Ombros')} />
            <path d="M 77 23 C 82 25, 84 29, 83 33 L 76 30 Z" fill={getMuscleColor('Ombros')} />

            {/* Chest (Peito) */}
            <path d="M 45 25 C 50 24, 57 25, 59 27 L 59 36 C 54 36, 47 34, 45 31 Z" fill={getMuscleColor('Peito')} />
            <path d="M 75 25 C 70 24, 63 25, 61 27 L 61 36 C 66 36, 73 34, 75 31 Z" fill={getMuscleColor('Peito')} />

            {/* Abs / Core */}
            <path d="M 50 37 L 70 37 L 67 66 L 53 66 Z" fill={getMuscleColor('Core')} />
            {/* Abs lines */}
            <line x1="51" y1="46" x2="69" y2="46" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />
            <line x1="52" y1="56" x2="68" y2="56" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />
            <line x1="60" y1="37" x2="60" y2="66" stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.4" />

            {/* Biceps & Forearms (Braços) */}
            <path d="M 37 32 C 34 37, 33 45, 31 55 C 33 57, 35 57, 37 55 C 39 49, 41 41, 43 32 Z" fill={getMuscleColor('Braços')} />
            <path d="M 83 32 C 86 37, 87 45, 89 55 C 87 57, 85 57, 83 55 C 81 49, 79 41, 77 32 Z" fill={getMuscleColor('Braços')} />

            {/* Legs Front (Pernas) */}
            <path d="M 44 68 L 59 68 L 57 108 L 42 108 Z" fill={getMuscleColor('Pernas')} />
            <path d="M 76 68 L 61 68 L 63 108 L 78 108 Z" fill={getMuscleColor('Pernas')} />

            {/* Calves Front */}
            <path d="M 42 110 L 56 110 L 53 145 L 45 145 Z" fill={getMuscleColor('Pernas')} />
            <path d="M 78 110 L 64 110 L 67 145 L 75 145 Z" fill={getMuscleColor('Pernas')} />


            {/* ================= BACK VIEW (x=180) ================= */}
            {/* Head & Neck */}
            <rect x="177" y="16" width="6" height="8" rx="2" fill="#cbd5e1" />
            <circle cx="180" cy="10" r="7.5" fill="#cbd5e1" />

            {/* Shoulders Back (Ombros) */}
            <path d="M 163 23 C 158 25, 156 29, 157 33 L 164 30 Z" fill={getMuscleColor('Ombros')} />
            <path d="M 197 23 C 202 25, 204 29, 203 33 L 196 30 Z" fill={getMuscleColor('Ombros')} />

            {/* Upper Back (Costas) */}
            <path d="M 165 25 C 173 24, 187 24, 195 25 L 192 40 C 184 42, 176 42, 168 40 Z" fill={getMuscleColor('Costas')} />

            {/* Lower Back (Costas) */}
            <path d="M 168 41 C 174 42, 186 42, 192 41 L 187 66 L 173 66 Z" fill={getMuscleColor('Costas')} />

            {/* Triceps (Braços) */}
            <path d="M 157 32 C 154 37, 153 45, 151 55 L 157 55 C 159 49, 161 41, 163 32 Z" fill={getMuscleColor('Braços')} />
            <path d="M 203 32 C 206 37, 207 45, 209 55 L 203 55 C 201 49, 199 41, 197 32 Z" fill={getMuscleColor('Braços')} />

            {/* Glutes & Hamstrings (Pernas Back) */}
            <path d="M 164 68 L 196 68 L 194 108 L 181 108 L 179 82 L 166 108 Z" fill={getMuscleColor('Pernas')} />

            {/* Calves Back */}
            <path d="M 166 110 L 178 110 L 174 145 L 169 145 Z" fill={getMuscleColor('Pernas')} />
            <path d="M 194 110 L 182 110 L 186 145 L 191 145 Z" fill={getMuscleColor('Pernas')} />
          </svg>
        </div>

        {/* Scanner Active Filter Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          
          {/* Legend Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
            {['Peito', 'Costas', 'Ombros', 'Braços', 'Pernas', 'Core'].map(muscle => {
              const isActive = activeMuscles.includes(muscle);
              return (
                <span 
                  key={muscle}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    backgroundColor: isActive ? 'rgba(255, 94, 58, 0.08)' : '#f1f5f9',
                    color: isActive ? 'var(--accent-color)' : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: isActive ? 'rgba(255, 94, 58, 0.2)' : 'transparent',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {muscle}
                </span>
              );
            })}
          </div>

          {/* Reset Scan Filter back to Geral if customized */}
          {selectedScanId !== 'geral' && (
            <button 
              className="btn btn-secondary btn-small"
              onClick={() => setSelectedScanId('geral')}
              style={{ alignSelf: 'center', fontSize: '0.72rem', padding: '4px 10px', marginTop: '4px' }}
            >
              Resetar para Scanner Geral
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD STATS ROW */}
      <div style={{ display: 'flex', gap: '10px' }}>
        
        <div className="glass-card" style={{ flex: 1, padding: '12px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Carga Total</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {(totalVolumeAllTime / 1000).toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>ton</span>
          </span>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '12px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {avgVolumePerWorkout.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>kg</span>
          </span>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '12px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Treinos</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {totalWorkouts} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>sessões</span>
          </span>
        </div>

      </div>

      {/* DAILY VOLUME AND MUSCLES TRACKER */}
      {sortedWorkouts.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} style={{ color: '#f59e0b' }} />
            Peso Levantado por Dia
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedWorkouts.slice(0, 5).map(workout => {
              const vol = getWorkoutVolume(workout);
              const muscles = getWorkoutMuscles(workout);
              const isSelected = selectedScanId === workout.id;
              
              return (
                <div 
                  key={workout.id}
                  onClick={() => setSelectedScanId(isSelected ? 'geral' : workout.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    backgroundColor: isSelected ? 'rgba(255, 94, 58, 0.05)' : '#ffffff',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-color)' : 'var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {workout.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatDate(workout.date)}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      {vol.toLocaleString()} kg
                    </span>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {muscles.map(m => (
                        <span key={m} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-color)' }} title={m} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FULL COLLAPSIBLE WORKOUT HISTORY LIST */}
      <div>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} style={{ color: 'var(--accent-color)' }} />
          Histórico Completo
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedWorkouts.length > 0 ? (
            sortedWorkouts.map((workout) => {
              const isExpanded = expandedWorkoutId === workout.id;
              const vol = getWorkoutVolume(workout);
              return (
                <div 
                  key={workout.id} 
                  className="glass-card" 
                  style={{ 
                    padding: 0, 
                    overflow: 'hidden', 
                    marginBottom: 0,
                    borderColor: isExpanded ? 'rgba(255, 94, 58, 0.3)' : 'var(--border-color)'
                  }}
                >
                  
                  {/* Header (Expand/Collapse triggers) */}
                  <div 
                    onClick={() => toggleExpand(workout.id)}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isExpanded ? 'rgba(255, 94, 58, 0.02)' : 'transparent',
                      transition: 'background var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {workout.name}
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {formatDate(workout.date)}
                        </span>
                        {workout.duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {formatDuration(workout.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isExpanded && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Dumbbell size={14} /> {vol.toLocaleString()} kg
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {formatTime(workout.date)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Workout Details */}
                  {isExpanded && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {workout.notes && (
                        <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
                          "{workout.notes}"
                        </div>
                      )}

                      {/* Exercises listing */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {workout.exercises.map((workoutExercise, idx) => (
                          <div key={idx} style={{ paddingBottom: '8px', borderBottom: idx < workout.exercises.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {workoutExercise.name}
                              </h4>
                              {workoutExercise.category && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: 'var(--text-muted)' }}>
                                  {workoutExercise.category}
                                </span>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                              {workoutExercise.sets.map((set, sIdx) => (
                                <span 
                                  key={set.id}
                                  style={{
                                    fontSize: '0.75rem',
                                    backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                    color: set.isCompleted ? 'var(--success)' : 'var(--text-muted)',
                                    border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid var(--border-color)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span style={{ fontWeight: 800 }}>#{sIdx + 1}</span> {set.weight}kg × {set.reps}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Volume Total: <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{vol.toLocaleString()} kg</span>
                        </span>
                        
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => {
                            if (confirm('Tens a certeza que queres eliminar permanentemente este treino do teu histórico? Isto não afetará os teus PRs atuais.')) {
                              onDeleteWorkout(workout.id);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '0.75rem'
                          }}
                        >
                          <Trash2 size={12} /> Eliminar Registo
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '0.85rem' }}>
              Ainda não realizaste nenhum treino. Começa um no separador do meio!
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
