import React, { useState } from 'react';
import type { Workout } from '../types';
import { Trash2, Calendar, Clock, ChevronDown, ChevronUp, Dumbbell, Award } from 'lucide-react';

interface HistoryViewProps {
  workouts: Workout[];
  onDeleteWorkout: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  workouts,
  onDeleteWorkout,
}) => {
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedWorkoutId(expandedWorkoutId === id ? null : id);
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
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

  const getWorkoutVolume = (workout: Workout) => {
    return workout.exercises.reduce((accEx, ex) => {
      return accEx + ex.sets.reduce((accSet, set) => {
        return set.isCompleted ? accSet + set.weight * set.reps : accSet;
      }, 0);
    }, 0);
  };

  const getWorkoutMuscles = (workout: Workout) => {
    const muscles = new Set<string>();
    workout.exercises.forEach(ex => { if (ex.category) muscles.add(ex.category); });
    return Array.from(muscles);
  };

  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalWorkouts = workouts.length;
  const totalVolumeAllTime = workouts.reduce((sum, w) => sum + getWorkoutVolume(w), 0);
  const avgVolumePerWorkout = totalWorkouts > 0 ? Math.round(totalVolumeAllTime / totalWorkouts) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Estatísticas & Histórico</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
          Analisa o teu progresso e volume de carga por sessão.
        </p>
      </div>

      {/* DASHBOARD STATS ROW */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <div className="glass-card" style={{ flex: 1, padding: '14px 10px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Carga Total</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {(totalVolumeAllTime / 1000).toFixed(1)}<span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}> ton</span>
          </span>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '14px 10px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Média/Treino</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {avgVolumePerWorkout.toLocaleString()}<span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}> kg</span>
          </span>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '14px 10px', marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Treinos</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            {totalWorkouts}<span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}> sessões</span>
          </span>
        </div>
      </div>

      {/* DAILY VOLUME LIST */}
      {sortedWorkouts.length > 0 && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Award size={14} style={{ color: '#f59e0b' }} />
            Peso Levantado por Dia
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedWorkouts.slice(0, 7).map(workout => {
              const vol = getWorkoutVolume(workout);
              const muscles = getWorkoutMuscles(workout);
              const maxVol = Math.max(...sortedWorkouts.slice(0, 7).map(w => getWorkoutVolume(w)), 1);
              const barWidth = Math.round((vol / maxVol) * 100);

              return (
                <div key={workout.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {workout.name}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {formatDate(workout.date)}
                        {muscles.length > 0 && ` · ${muscles.join(', ')}`}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent-color)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                      {vol.toLocaleString()} kg
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: 'linear-gradient(90deg, var(--accent-color), #ff8a00)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  <div
                    onClick={() => toggleExpand(workout.id)}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isExpanded ? 'rgba(255, 94, 58, 0.02)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {workout.name}
                        {isExpanded ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} />{formatDate(workout.date)}
                        </span>
                        {workout.duration && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />{formatDuration(workout.duration)}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isExpanded && (
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Dumbbell size={13} /> {vol.toLocaleString()} kg
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatTime(workout.date)}</span>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {workout.notes && (
                        <div style={{ fontStyle: 'italic', fontSize: '0.82rem', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-color)' }}>
                          "{workout.notes}"
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {workout.exercises.map((workoutExercise, idx) => (
                          <div key={idx} style={{ paddingBottom: '8px', borderBottom: idx < workout.exercises.length - 1 ? '1px dashed rgba(15,23,42,0.06)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {workoutExercise.name}
                              </h4>
                              {workoutExercise.category && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: 'var(--text-muted)' }}>
                                  {workoutExercise.category}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                              {workoutExercise.sets.map((set, sIdx) => (
                                <span
                                  key={set.id}
                                  style={{
                                    fontSize: '0.72rem',
                                    backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc',
                                    color: set.isCompleted ? 'var(--success)' : 'var(--text-muted)',
                                    border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid var(--border-color)',
                                    padding: '3px 7px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <span style={{ fontWeight: 800 }}>#{sIdx + 1}</span> {set.weight}kg × {set.reps}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          Volume: <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{vol.toLocaleString()} kg</span>
                        </span>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => {
                            window.customConfirm(
                              'Eliminar Treino',
                              'Tem a certeza que deseja eliminar este registo de treino? Esta ação é irreversível.',
                              () => {
                                onDeleteWorkout(workout.id);
                              }
                            );
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', fontSize: '0.72rem' }}
                        >
                          <Trash2 size={11} /> Eliminar
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
