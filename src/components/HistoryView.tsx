import React, { useState } from 'react';
import type { Workout } from '../types';
import { Trash2, Calendar, Clock, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react';

interface HistoryViewProps {
  workouts: Workout[];
  onDeleteWorkout: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  workouts,
  onDeleteWorkout,
}) => {
  // Store expanded workout IDs
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-PT', { 
      weekday: 'long', 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    }).replace(/^\w/, (c) => c.toUpperCase()); // Capitalize weekday
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

  // Sort workouts newest first
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Histórico de Treinos</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Revê as tuas sessões de treino anteriores.
        </p>
      </div>

      {/* Workouts History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedWorkouts.length > 0 ? (
          sortedWorkouts.map((workout) => {
            const isExpanded = expandedWorkoutId === workout.id;
            return (
              <div 
                key={workout.id} 
                className="glass-card" 
                style={{ 
                  padding: 0, 
                  overflow: 'hidden', 
                  marginBottom: 0,
                  borderColor: isExpanded ? 'rgba(255, 255, 255, 0.15)' : 'var(--border-color)'
                }}
              >
                
                {/* Workout Card Header (Clickable to expand) */}
                <div 
                  onClick={() => toggleExpand(workout.id)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                    transition: 'background var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

                  {/* Quick stats on the right (collapsed only) */}
                  {!isExpanded && (
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Dumbbell size={14} /> {workout.exercises.length} Exs
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatTime(workout.date)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {workout.notes && (
                      <div style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                        "{workout.notes}"
                      </div>
                    )}

                    {/* Exercises Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {workout.exercises.map((workoutExercise, idx) => (
                        <div key={idx} style={{ paddingBottom: '8px', borderBottom: idx < workout.exercises.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {workoutExercise.name}
                          </h4>
                          
                          {/* Completed sets listing */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                            {workoutExercise.sets.map((set, sIdx) => (
                              <span 
                                key={set.id}
                                style={{
                                  fontSize: '0.75rem',
                                  backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                  color: set.isCompleted ? 'var(--success)' : 'var(--text-muted)',
                                  border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
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

                    {/* Delete Workout Action */}
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => {
                        if (confirm('Tens a certeza que queres eliminar permanentemente este treino do teu histórico? Isto não afetará os teus PRs atuais.')) {
                          onDeleteWorkout(workout.id);
                        }
                      }}
                      style={{
                        alignSelf: 'flex-end',
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
                )}

              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '16px', fontSize: '0.85rem' }}>
            Ainda não realizaste nenhum treino.
          </div>
        )}
      </div>

    </div>
  );
};
