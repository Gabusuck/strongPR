import React, { useState, useEffect, useRef } from 'react';
import type { Workout, Exercise, WorkoutExercise, Set, AppSettings } from '../types';
import { Plus, Trash2, Check, Timer, X } from 'lucide-react';

interface WorkoutLogProps {
  activeWorkout: Workout | null;
  exercises: Exercise[];
  settings: AppSettings;
  onUpdateWorkout: (workout: Workout) => void;
  onSaveWorkout: () => void;
  onCancelWorkout: () => void;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({
  activeWorkout,
  exercises,
  settings,
  onUpdateWorkout,
  onSaveWorkout,
  onCancelWorkout,
}) => {
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timer State for rest periods
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  
  const timerIntervalRef = useRef<number | null>(null);

  // Active workout duration timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active workout duration tick
  useEffect(() => {
    if (!activeWorkout) return;
    
    // Calculate initial elapsed time in case it was already running or saved
    const startTime = activeWorkout.date ? new Date(activeWorkout.date).getTime() : Date.now();
    
    const interval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(seconds >= 0 ? seconds : 0);
    }, 1000);
    
    return () => window.clearInterval(interval);
  }, [activeWorkout]);

  // Handle saving elapsed duration on component unmount / update
  useEffect(() => {
    if (activeWorkout) {
      onUpdateWorkout({
        ...activeWorkout,
        duration: elapsedSeconds
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds]);

  // Handle rest timer countdown
  useEffect(() => {
    if (restTimeLeft === null) return;

    if (restTimeLeft <= 0) {
      triggerRestEndNotifications();
      setRestTimeLeft(null);
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setRestTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, [restTimeLeft]);

  const triggerRestEndNotifications = () => {
    // 1. Vibration API
    if (settings.enableVibration && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    // 2. Play Audio beep using web audio API so we don't need audio asset file
    if (settings.enableSound) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Short high-pitched double beep
        const playBeep = (time: number, freq: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.15, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
          
          osc.start(time);
          osc.stop(time + 0.15);
        };
        
        const now = audioCtx.currentTime;
        playBeep(now, 880); // A5 note
        playBeep(now + 0.25, 880);
      } catch (err) {
        console.error('Audio beep error', err);
      }
    }
  };

  if (!activeWorkout) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', textAlign: 'center', gap: '16px' }}>
        <DumbbellIllustration />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nenhum treino ativo</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px' }}>
          Clica em "Iniciar Novo Treino" para começar a registar as tuas séries.
        </p>
      </div>
    );
  }

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add exercise to active workout
  const handleAddExercise = (exercise: Exercise) => {
    // Avoid duplicates
    if (activeWorkout.exercises.some((e) => e.id === exercise.id)) {
      setShowAddExerciseModal(false);
      return;
    }

    const newWorkoutExercise: WorkoutExercise = {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      sets: [
        {
          id: Math.random().toString(36).substring(2, 9),
          weight: 0,
          reps: 0,
          isCompleted: false,
        },
      ],
    };

    onUpdateWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newWorkoutExercise],
    });
    setShowAddExerciseModal(false);
  };

  // Remove exercise from active workout
  const handleRemoveExercise = (exerciseId: string) => {
    if (confirm('Tens a certeza que queres remover este exercício do treino atual?')) {
      onUpdateWorkout({
        ...activeWorkout,
        exercises: activeWorkout.exercises.filter((e) => e.id !== exerciseId),
      });
    }
  };

  // Add a set to an exercise
  const handleAddSet = (exerciseId: string) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;

        // Copy weight and reps from the last set as default values
        const lastSet = ex.sets[ex.sets.length - 1];
        const defaultWeight = lastSet ? lastSet.weight : 0;
        const defaultReps = lastSet ? lastSet.reps : 0;

        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: Math.random().toString(36).substring(2, 9),
              weight: defaultWeight,
              reps: defaultReps,
              isCompleted: false,
            },
          ],
        };
      }),
    });
  };

  // Remove a set from an exercise
  const handleRemoveSet = (exerciseId: string, setId: string) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        // Don't leave exercise with 0 sets (or we can let it be empty)
        const updatedSets = ex.sets.filter((s) => s.id !== setId);
        return {
          ...ex,
          sets: updatedSets.length > 0 ? updatedSets : [
            { id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }
          ],
        };
      }),
    });
  };

  // Update set field (weight, reps, or completed status)
  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<Set>) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            
            // Check if marking as completed to trigger rest timer
            const isMarkingComplete = updates.isCompleted === true && !s.isCompleted;
            if (isMarkingComplete) {
              setRestTimeLeft(settings.defaultRestDuration);
              
            }

            return { ...s, ...updates };
          }),
        };
      }),
    });
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Workout Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <input
            type="text"
            className="form-input"
            value={activeWorkout.name}
            onChange={(e) => onUpdateWorkout({ ...activeWorkout, name: e.target.value })}
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              width: '240px',
              borderBottom: '1px solid transparent',
              borderRadius: 0
            }}
            placeholder="Nome do Treino"
            onFocus={(e) => e.target.style.borderBottom = '1px solid var(--accent)'}
            onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent)', borderRadius: '50%' }}></span>
            Em progresso...
          </div>
        </div>

        {/* Workout Duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          ⏱️ {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      {/* Exercises List in Workout */}
      {activeWorkout.exercises.map((workoutExercise) => (
        <div key={workoutExercise.id} className="glass-card" style={{ padding: '16px 14px' }}>
          
          {/* Exercise Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {workoutExercise.name}
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {workoutExercise.category}
              </span>
            </div>
            <button 
              onClick={() => handleRemoveExercise(workoutExercise.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Sets Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 50px', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px', paddingLeft: '8px' }}>
            <span>Série</span>
            <span style={{ textAlign: 'center' }}>Peso (kg)</span>
            <span style={{ textAlign: 'center' }}>Reps</span>
            <span style={{ textAlign: 'center' }}>OK</span>
          </div>

          {/* Sets Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workoutExercise.sets.map((set, setIdx) => (
              <div 
                key={set.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr 50px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                  border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid transparent',
                  transition: 'background var(--transition-fast)'
                }}
              >
                {/* Set Number */}
                <div 
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    color: set.isCompleted ? 'var(--success)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleRemoveSet(workoutExercise.id, set.id)}
                  title="Clique para remover série"
                >
                  {setIdx + 1}
                </div>

                {/* Weight Input */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="decimal"
                    className="form-input"
                    value={set.weight || ''}
                    disabled={set.isCompleted}
                    onChange={(e) => handleUpdateSet(workoutExercise.id, set.id, { weight: parseFloat(e.target.value) || 0 })}
                    style={{
                      textAlign: 'center',
                      padding: '6px',
                      maxWidth: '80px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      opacity: set.isCompleted ? 0.6 : 1
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Reps Input */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    className="form-input"
                    value={set.reps || ''}
                    disabled={set.isCompleted}
                    onChange={(e) => handleUpdateSet(workoutExercise.id, set.id, { reps: parseInt(e.target.value, 10) || 0 })}
                    style={{
                      textAlign: 'center',
                      padding: '6px',
                      maxWidth: '80px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      opacity: set.isCompleted ? 0.6 : 1
                    }}
                    placeholder="0"
                  />
                </div>

                {/* Checkbox (Complete) */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    className={`set-checkbox ${set.isCompleted ? 'checked' : ''}`}
                    onClick={() => handleUpdateSet(workoutExercise.id, set.id, { isCompleted: !set.isCompleted })}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Set Button */}
          <button
            onClick={() => handleAddSet(workoutExercise.id)}
            style={{
              width: '100%',
              background: 'none',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'background var(--transition-fast)'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
          >
            <Plus size={14} /> Adicionar Série
          </button>

        </div>
      ))}

      {/* Main Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => setShowAddExerciseModal(true)}
          style={{ flex: 1, padding: '14px' }}
        >
          <Plus size={18} /> Adicionar Exercício
        </button>
        
        <button
          className="btn btn-primary"
          onClick={onSaveWorkout}
          style={{ flex: 1, padding: '14px' }}
        >
          Gravar Treino
        </button>
      </div>

      <button
        className="btn btn-danger btn-small"
        onClick={onCancelWorkout}
        style={{ marginTop: '10px', width: '100%' }}
      >
        Cancelar e Descartar Treino
      </button>

      {/* Rest Timer Floating Pill */}
      {restTimeLeft !== null && (
        <div 
          className="timer-pill" 
          onClick={() => {
            // Clicking the timer adds 30 seconds
            setRestTimeLeft((prev) => (prev !== null ? prev + 30 : 30));
          }}
          title="Clique para adicionar +30s"
        >
          <Timer size={18} />
          <span>Resto: {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation(); // Avoid adding time when cancelling
              setRestTimeLeft(null);
            }}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowAddExerciseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Escolher Exercício</h3>
              <button 
                onClick={() => setShowAddExerciseModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <input
              type="text"
              className="form-input"
              placeholder="Pesquisar por nome ou grupo muscular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '16px' }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => {
                  const isAlreadyAdded = activeWorkout.exercises.some((added) => added.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleAddExercise(ex)}
                      disabled={isAlreadyAdded}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isAlreadyAdded ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        color: isAlreadyAdded ? 'var(--text-muted)' : 'var(--text-primary)',
                        textAlign: 'left',
                        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                        transition: 'background var(--transition-fast)'
                      }}
                      onMouseOver={(e) => {
                        if (!isAlreadyAdded) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                      }}
                      onMouseOut={(e) => {
                        if (!isAlreadyAdded) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ex.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.category}</div>
                      </div>
                      {isAlreadyAdded ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Adicionado</span>
                      ) : (
                        <Plus size={16} style={{ color: 'var(--accent)' }} />
                      )}
                    </button>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: '0.85rem' }}>
                  Nenhum exercício encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const DumbbellIllustration: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1.5-1.5" />
    <path d="m3 3 1.5 1.5" />
    <path d="m18.5 5.5 3 3-2.5 2.5-3-3Z" />
    <path d="m5.5 18.5 3 3-2.5 2.5-3-3Z" />
    <path d="m8.5 14 1.5 1.5" />
    <path d="m14 8.5 1.5 1.5" />
  </svg>
);
