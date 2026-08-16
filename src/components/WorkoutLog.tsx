import React, { useState, useEffect, useRef } from 'react';
import type { Workout, Exercise, WorkoutExercise, Set, AppSettings } from '../types';
import { Plus, Trash2, Check, X } from 'lucide-react';

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
  const [restDuration, setRestDuration] = useState<number>(settings.defaultRestDuration);
  const timerIntervalRef = useRef<number | null>(null);

  // Active workout duration timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active workout duration tick
  useEffect(() => {
    if (!activeWorkout) return;
    
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
    // 2. Play Audio beep using web audio API
    if (settings.enableSound) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        playBeep(now, 880);
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
            
            const isMarkingComplete = updates.isCompleted === true && !s.isCompleted;
            if (isMarkingComplete) {
              setRestTimeLeft(settings.defaultRestDuration);
              setRestDuration(settings.defaultRestDuration);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {/* Workout Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <input
            type="text"
            className="form-input"
            value={activeWorkout.name}
            onChange={(e) => onUpdateWorkout({ ...activeWorkout, name: e.target.value })}
            style={{
              fontSize: '1.4rem',
              fontWeight: 850,
              fontFamily: 'var(--font-display)',
              background: 'transparent',
              border: 'none',
              padding: '4px 0',
              width: '220px',
              borderBottom: '1px solid transparent',
              borderRadius: 0
            }}
            placeholder="Nome do Treino"
            onFocus={(e) => e.target.style.borderBottom = '1px solid var(--accent-color)'}
            onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent-color)', borderRadius: '50%', boxShadow: '0 0 6px var(--accent-color)' }}></span>
            A treinar...
          </div>
        </div>

        {/* Workout Duration */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 14px', borderRadius: '20px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
          ⏱️ {formatElapsed(elapsedSeconds)}
        </div>
      </div>

      {/* Exercises List in Workout */}
      {activeWorkout.exercises.map((workoutExercise) => (
        <div key={workoutExercise.id} className="glass-card" style={{ padding: '20px 16px' }}>
          
          {/* Exercise Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {workoutExercise.name}
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                {workoutExercise.category}
              </span>
            </div>
            <button 
              onClick={() => handleRemoveExercise(workoutExercise.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Sets Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1.2fr 1fr 40px', gap: '10px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '8px', paddingLeft: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ textAlign: 'center' }}>Série</span>
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
                  gridTemplateColumns: '40px 1.2fr 1fr 40px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '6px 8px',
                  borderRadius: '10px',
                  backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)',
                  border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {/* Set Number */}
                <div 
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    textAlign: 'center',
                    color: set.isCompleted ? 'var(--success)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleRemoveSet(workoutExercise.id, set.id)}
                  title="Remover série"
                >
                  {setIdx + 1}
                </div>

                {/* Weight Input with +/- Helpers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  <button 
                    className="btn-inc-dec" 
                    disabled={set.isCompleted}
                    onClick={() => handleUpdateSet(workoutExercise.id, set.id, { weight: Math.max(0, set.weight - 2.5) })}
                  >
                    -
                  </button>
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
                      padding: '5px',
                      maxWidth: '45px',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      border: 'none',
                      background: 'transparent',
                      opacity: set.isCompleted ? 0.6 : 1
                    }}
                    placeholder="0"
                  />
                  <button 
                    className="btn-inc-dec" 
                    disabled={set.isCompleted}
                    onClick={() => handleUpdateSet(workoutExercise.id, set.id, { weight: set.weight + 2.5 })}
                  >
                    +
                  </button>
                </div>

                {/* Reps Input with +/- Helpers */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                  <button 
                    className="btn-inc-dec" 
                    disabled={set.isCompleted}
                    onClick={() => handleUpdateSet(workoutExercise.id, set.id, { reps: Math.max(0, set.reps - 1) })}
                  >
                    -
                  </button>
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
                      padding: '5px',
                      maxWidth: '35px',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      border: 'none',
                      background: 'transparent',
                      opacity: set.isCompleted ? 0.6 : 1
                    }}
                    placeholder="0"
                  />
                  <button 
                    className="btn-inc-dec" 
                    disabled={set.isCompleted}
                    onClick={() => handleUpdateSet(workoutExercise.id, set.id, { reps: set.reps + 1 })}
                  >
                    +
                  </button>
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
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '10px',
              borderRadius: '10px',
              cursor: 'pointer',
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all var(--transition-fast)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
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
          style={{ flex: 1, padding: '15px' }}
        >
          <Plus size={18} /> Adicionar Exercício
        </button>
        
        <button
          className="btn btn-primary"
          onClick={onSaveWorkout}
          style={{ flex: 1, padding: '15px' }}
        >
          Gravar Treino
        </button>
      </div>

      <button
        className="btn btn-danger btn-small"
        onClick={onCancelWorkout}
        style={{ marginTop: '10px', width: '100%', padding: '12px' }}
      >
        Descartar Treino
      </button>

      {/* Circular Floating Rest Timer */}
      {restTimeLeft !== null && (
        <div 
          className="circular-timer-container" 
          onClick={() => {
            setRestTimeLeft((prev) => (prev !== null ? prev + 30 : 30));
          }}
          title="Clique para adicionar +30s"
        >
          <svg className="circular-timer-svg">
            <defs>
              <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff5e3a" />
                <stop offset="100%" stopColor="#ff2a68" />
              </linearGradient>
            </defs>
            <circle cx="43" cy="43" r="36" className="circular-timer-bg" />
            <circle 
              cx="43" 
              cy="43" 
              r="36" 
              className="circular-timer-progress" 
              strokeDasharray="226" 
              strokeDashoffset={226 - (226 * restTimeLeft) / restDuration} 
            />
          </svg>
          <div className="circular-timer-text">
            <span>{Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}</span>
            <span className="circular-timer-sub">+30s</span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setRestTimeLeft(null);
            }}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 'bold',
              boxShadow: '0 2px 6px rgba(0,0,0,0.6)'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <div className="modal-overlay" onClick={() => setShowAddExerciseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Escolher Exercício</h3>
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
              placeholder="Pesquisar exercício ou grupo muscular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: '18px' }}
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
                        padding: '14px 16px',
                        borderRadius: '12px',
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
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ex.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{ex.category}</div>
                      </div>
                      {isAlreadyAdded ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>Adicionado</span>
                      ) : (
                        <Plus size={18} style={{ color: 'var(--accent-color)' }} />
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
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1.5-1.5" />
    <path d="m3 3 1.5 1.5" />
    <path d="m18.5 5.5 3 3-2.5 2.5-3-3Z" />
    <path d="m5.5 18.5 3 3-2.5 2.5-3-3Z" />
    <path d="m8.5 14 1.5 1.5" />
    <path d="m14 8.5 1.5 1.5" />
  </svg>
);
