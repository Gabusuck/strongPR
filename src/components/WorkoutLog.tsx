import React, { useState, useEffect, useRef } from 'react';
import type { Workout, Exercise, WorkoutExercise, Set, AppSettings } from '../types';
import { Plus, Trash2, Check, X, Dumbbell, ChevronLeft, Search, Info } from 'lucide-react';
import { translateExerciseName } from '../utils/translateExercise';

// ─── Free Exercise DB types ───────────────────────────────────────────────────
interface ApiExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

const DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const DB_JSON = `${DB_BASE}/dist/exercises.json`;

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
  biceps: 'Bíceps', triceps: 'Tríceps', abdominals: 'Abdominais',
  quadriceps: 'Quadríceps', hamstrings: 'Isquiotibiais',
  glutes: 'Glúteos', calves: 'Gémeos', forearms: 'Antebraços',
  'lower back': 'Lombar', 'middle back': 'Costas Médias',
  traps: 'Trapézio', lats: 'Grande Dorsal', neck: 'Pescoço',
  abductors: 'Abdutores', adductors: 'Adutores',
};

const mapCategory = (primaryMuscles: string[]): string => {
  return MUSCLE_LABELS[primaryMuscles[0]?.toLowerCase()] || primaryMuscles[0] || 'Outro';
};

const ALL_FILTER_MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'abdominals', 'quadriceps', 'hamstrings', 'glutes', 'calves',
];

// Agrupa músculos da API por categoria de filtro
const MUSCLE_GROUPS: Record<string, string[]> = {
  chest: ['chest', 'pectorals'],
  back: ['lats', 'middle back', 'lower back', 'upper back', 'traps', 'back'],
  shoulders: ['shoulders', 'deltoids', 'front deltoids', 'rear deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  abdominals: ['abdominals', 'core'],
  quadriceps: ['quadriceps', 'quads'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes', 'gluteus maximus'],
  calves: ['calves'],
};

const muscleMatchesFilter = (primaryMuscles: string[], filter: string): boolean => {
  if (filter === 'all') return true;
  const group = MUSCLE_GROUPS[filter];
  if (!group) return false;
  return primaryMuscles.some(m => group.includes(m.toLowerCase()));
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface WorkoutLogProps {
  activeWorkout: Workout | null;
  exercises: Exercise[];
  settings: AppSettings;
  onUpdateWorkout: (workout: Workout) => void;
  onSaveWorkout: () => void;
  onCancelWorkout: () => void;
  onStartWorkout: () => void;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({
  activeWorkout,
  exercises,
  settings,
  onUpdateWorkout,
  onCancelWorkout,
  onStartWorkout,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaveWorkout: _onSaveWorkout,
}) => {
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [selectedApiExercise, setSelectedApiExercise] = useState<ApiExercise | null>(null);
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState<number>(settings.defaultRestDuration);
  const timerIntervalRef = useRef<number | null>(null);

  // Elapsed workout time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Slideshow auto-switch for selected exercise detail
  useEffect(() => {
    if (!selectedApiExercise) return;
    setImageIdx(0);
    const t = window.setInterval(() => setImageIdx(i => (i === 0 ? 1 : 0)), 1800);
    return () => clearInterval(t);
  }, [selectedApiExercise]);

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

  // Save elapsed duration on each tick
  useEffect(() => {
    if (activeWorkout) {
      onUpdateWorkout({ ...activeWorkout, duration: elapsedSeconds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimeLeft === null) return;
    if (restTimeLeft <= 0) {
      triggerRestEndNotifications();
      setRestTimeLeft(null);
      return;
    }
    // Update lock-screen notification countdown
    updateCountdownNotification(restTimeLeft);

    timerIntervalRef.current = window.setInterval(() => {
      setRestTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => { if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current); };
  }, [restTimeLeft]);

  // Clear notification when timer is stopped/reset
  useEffect(() => {
    if (restTimeLeft === null) {
      clearCountdownNotification();
    }
  }, [restTimeLeft]);

  // Fetch exercises from API when modal opens
  useEffect(() => {
    if (!showAddExerciseModal || apiExercises.length > 0 || apiLoading) return;
    setApiLoading(true);
    setApiError(false);
    fetch(DB_JSON)
      .then(r => r.json())
      .then((data: ApiExercise[]) => {
        setApiExercises(data);
        setApiLoading(false);
      })
      .catch(() => {
        setApiError(true);
        setApiLoading(false);
      });
  }, [showAddExerciseModal]);

  const triggerRestEndNotifications = () => {
    if (settings.enableVibration && 'vibrate' in navigator) navigator.vibrate([200, 100, 200]);
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
      } catch (err) { console.error('Audio beep error', err); }
    }

    // System Push Notification (reuses 'rest-timer-countdown' tag with renotify to beep and replace previous countdown)
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('Tempo de Descanso Concluído! ⏱️', {
            body: 'Está na hora de começares a próxima série!',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'rest-timer-countdown',
            renotify: true,
            vibrate: [200, 100, 200]
          } as any);
        }).catch(() => {
          new Notification('Tempo de Descanso Concluído! ⏱️', {
            body: 'Está na hora de começares a próxima série!',
            icon: '/logo.png',
            tag: 'rest-timer-countdown',
            renotify: true
          } as any);
        });
      } else {
        new Notification('Tempo de Descanso Concluído! ⏱️', {
          body: 'Está na hora de começares a próxima série!',
          icon: '/logo.png',
          tag: 'rest-timer-countdown',
          renotify: true
        } as any);
      }
    }
  };

  // Helper to silently update lock-screen notification timer
  const updateCountdownNotification = (timeLeft: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      const title = `Descanso Ativo: ${timeStr} ⏱️`;
      const body = 'Prepara-te para a próxima série';
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'rest-timer-countdown',
            renotify: false,
            silent: true
          } as any);
        }).catch(() => {
          new Notification(title, {
            body,
            icon: '/logo.png',
            tag: 'rest-timer-countdown',
            renotify: false,
            silent: true
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: 'rest-timer-countdown',
          renotify: false,
          silent: true
        } as any);
      }
    }
  };

  // Helper to completely dismiss lock-screen notification when timer finishes or is cancelled
  const clearCountdownNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.getNotifications) {
            registration.getNotifications({ tag: 'rest-timer-countdown' }).then((notifications) => {
              notifications.forEach((n) => n.close());
            });
          }
        });
      }
    }
  };

  if (!activeWorkout) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', padding: '20px', borderRadius: '50%', backgroundColor: 'rgba(255, 94, 58, 0.05)', color: 'var(--accent-color)', marginBottom: '8px' }}>
          <Dumbbell size={48} style={{ transform: 'rotate(-45deg)' }} />
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Pronto para o Treino?</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '280px', lineHeight: '1.4' }}>
          Cria o teu treino em tempo real, regista cargas e bate os teus recordes pessoais!
        </p>
        <button
          className="btn btn-primary"
          onClick={onStartWorkout}
          style={{ padding: '14px 28px', fontSize: '1rem', width: '220px' }}
        >
          Iniciar Novo Treino
        </button>
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
  const handleAddExercise = (exercise: Exercise | ApiExercise) => {
    const id = exercise.id;
    if (activeWorkout.exercises.some((e) => e.id === id)) {
      setShowAddExerciseModal(false);
      return;
    }

    let category = '';
    if ('primaryMuscles' in exercise) {
      category = mapCategory(exercise.primaryMuscles);
    } else {
      category = (exercise as Exercise).category;
    }

    const newWorkoutExercise: WorkoutExercise = {
      id,
      name: exercise.name,
      category,
      sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
    };
    onUpdateWorkout({ ...activeWorkout, exercises: [...activeWorkout.exercises, newWorkoutExercise] });
    setShowAddExerciseModal(false);
    setSelectedApiExercise(null);
    setSearchQuery('');
    setMuscleFilter('all');
  };

  const handleRemoveExercise = (exerciseId: string) => {
    window.customConfirm(
      'Remover Exercício',
      'Tem a certeza que deseja remover este exercício do treino atual?',
      () => {
        onUpdateWorkout({
          ...activeWorkout,
          exercises: activeWorkout.exercises.filter((e) => e.id !== exerciseId),
        });
      }
    );
  };

  const handleAddSet = (exerciseId: string) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { id: Math.random().toString(36).substring(2, 9), weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, isCompleted: false }],
        };
      }),
    });
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const updatedSets = ex.sets.filter((s) => s.id !== setId);
        return { ...ex, sets: updatedSets.length > 0 ? updatedSets : [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }] };
      }),
    });
  };

  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<Set>) => {
    onUpdateWorkout({
      ...activeWorkout,
      exercises: activeWorkout.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s;
            if (updates.isCompleted === true && !s.isCompleted) {
              setRestTimeLeft(settings.defaultRestDuration);
              setRestDuration(settings.defaultRestDuration);

              // Pedir permissão de notificações no telemóvel quando inicia o primeiro temporizador
              if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }
            return { ...s, ...updates };
          }),
        };
      }),
    });
  };

  // Combine local custom exercises + filter API exercises
  const localExercises = exercises.filter(ex => ex.isCustom);

  const filteredApiExercises = apiExercises.filter(ex => {
    const matchesMuscle = muscleMatchesFilter(ex.primaryMuscles, muscleFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      ex.name.toLowerCase().includes(q) ||
      ex.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
      ex.primaryMuscles.some(m => (MUSCLE_LABELS[m.toLowerCase()] || '').toLowerCase().includes(q));
    return matchesMuscle && matchesSearch;
  });

  const filteredLocalExercises = localExercises.filter(ex =>
    !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Workout Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <input
            type="text"
            className="form-input"
            value={activeWorkout.name}
            onChange={(e) => onUpdateWorkout({ ...activeWorkout, name: e.target.value })}
            style={{ fontSize: '1.4rem', fontWeight: 850, fontFamily: 'var(--font-display)', background: 'transparent', border: 'none', padding: '4px 0', width: '200px', borderBottom: '1px solid transparent', borderRadius: 0 }}
            placeholder="Nome do Treino"
            onFocus={(e) => e.target.style.borderBottom = '1px solid var(--accent-color)'}
            onBlur={(e) => e.target.style.borderBottom = '1px solid transparent'}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: 'var(--accent-color)', borderRadius: '50%', boxShadow: '0 0 6px var(--accent-color)' }} />
            A treinar...
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            ⏱️ {formatElapsed(elapsedSeconds)}
          </div>
          {/* Discard button — subtle trash icon */}
          <button
            onClick={onCancelWorkout}
            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7 }}
            title="Descartar treino"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Sleek Inline Rest Timer */}
      {restTimeLeft !== null && (
        <div style={{
          background: 'rgba(255, 94, 58, 0.04)',
          border: '1px solid rgba(255, 94, 58, 0.15)',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1rem' }}>⏱️</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-primary)' }}>Descanso Ativo</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Tempo para recuperar</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent-color)', letterSpacing: '-0.02em' }}>
                {Math.floor(restTimeLeft / 60)}:{(restTimeLeft % 60).toString().padStart(2, '0')}
              </span>
              <button 
                onClick={() => setRestTimeLeft((prev) => (prev !== null ? prev + 30 : 30))}
                style={{ backgroundColor: 'rgba(255, 94, 58, 0.08)', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-color)', cursor: 'pointer' }}
              >
                +30s
              </button>
              <button 
                onClick={() => setRestTimeLeft(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', marginLeft: '2px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {/* Progress Bar */}
          <div style={{ height: '3px', backgroundColor: 'rgba(255, 94, 58, 0.1)', borderRadius: '1.5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(restTimeLeft / restDuration) * 100}%`, background: 'linear-gradient(90deg, var(--accent-color), #ff8a00)', borderRadius: '1.5px', transition: 'width 1s linear' }} />
          </div>
        </div>
      )}

      {/* Exercises */}
      {activeWorkout.exercises.map((workoutExercise) => (
        <div key={workoutExercise.id} className="glass-card" style={{ padding: '20px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{workoutExercise.name}</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{workoutExercise.category}</span>
            </div>
            <button onClick={() => handleRemoveExercise(workoutExercise.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', opacity: 0.6 }}>
              <X size={16} />
            </button>
          </div>

          {/* Set headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '30px 1.2fr 1fr 34px', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ textAlign: 'center' }}>Série</span>
            <span style={{ textAlign: 'center' }}>Peso (kg)</span>
            <span style={{ textAlign: 'center' }}>Reps</span>
            <span style={{ textAlign: 'center' }}>OK</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {workoutExercise.sets.map((set, setIdx) => (
              <div key={set.id} style={{ display: 'grid', gridTemplateColumns: '30px 1.2fr 1fr 34px', gap: '6px', alignItems: 'center', padding: '6px 8px', borderRadius: '10px', backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)', transition: 'all var(--transition-fast)' }}>
                {/* Set Number */}
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center', color: set.isCompleted ? 'var(--success)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => handleRemoveSet(workoutExercise.id, set.id)} title="Remover série">
                  {setIdx + 1}
                </div>

                {/* Weight */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                  <button className="btn-inc-dec" style={{ width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.8rem' }} disabled={set.isCompleted} onClick={() => handleUpdateSet(workoutExercise.id, set.id, { weight: Math.max(0, set.weight - 2.5) })}>-</button>
                  <input
                    type="number"
                    className="form-input set-input"
                    value={set.weight || ''}
                    readOnly={set.isCompleted}
                    onChange={(e) => handleUpdateSet(workoutExercise.id, set.id, { weight: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    style={{ width: '46px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', padding: '4px 2px', opacity: set.isCompleted ? 0.7 : 1, minHeight: 'auto', height: '32px' }}
                  />
                  <button className="btn-inc-dec" style={{ width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.8rem' }} disabled={set.isCompleted} onClick={() => handleUpdateSet(workoutExercise.id, set.id, { weight: set.weight + 2.5 })}>+</button>
                </div>

                {/* Reps */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'center' }}>
                  <button className="btn-inc-dec" style={{ width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.8rem' }} disabled={set.isCompleted} onClick={() => handleUpdateSet(workoutExercise.id, set.id, { reps: Math.max(0, set.reps - 1) })}>-</button>
                  <input
                    type="number"
                    className="form-input set-input"
                    value={set.reps || ''}
                    readOnly={set.isCompleted}
                    onChange={(e) => handleUpdateSet(workoutExercise.id, set.id, { reps: parseInt(e.target.value, 10) || 0 })}
                    placeholder="0"
                    style={{ width: '36px', textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', padding: '4px 2px', opacity: set.isCompleted ? 0.7 : 1, minHeight: 'auto', height: '32px' }}
                  />
                  <button className="btn-inc-dec" style={{ width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.8rem' }} disabled={set.isCompleted} onClick={() => handleUpdateSet(workoutExercise.id, set.id, { reps: set.reps + 1 })}>+</button>
                </div>

                {/* Check */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button className={`set-checkbox ${set.isCompleted ? 'checked' : ''}`} style={{ width: '26px', height: '26px' }} onClick={() => handleUpdateSet(workoutExercise.id, set.id, { isCompleted: !set.isCompleted })}>
                    <Check size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Set */}
          <button onClick={() => handleAddSet(workoutExercise.id)} style={{ width: '100%', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 700, padding: '10px', borderRadius: '10px', cursor: 'pointer', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Plus size={14} /> Adicionar Série
          </button>
        </div>
      ))}

      {/* Add Exercise Button */}
      <button
        className="btn btn-secondary"
        onClick={() => setShowAddExerciseModal(true)}
        style={{ padding: '15px', fontSize: '0.95rem' }}
      >
        <Plus size={18} /> Adicionar Exercício
      </button>

      {/* ─── Add Exercise Modal ──────────────────────────────────────────────── */}
      {showAddExerciseModal && (
        <div
          onClick={() => { setShowAddExerciseModal(false); setSelectedApiExercise(null); setSearchQuery(''); setMuscleFilter('all'); }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', height: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', borderRadius: '24px 24px 0 0', overflow: 'hidden' }}
          >
            {/* ── Exercise Detail View ── */}
            {selectedApiExercise ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <button onClick={() => setSelectedApiExercise(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={22} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translateExerciseName(selectedApiExercise.name)}</h3>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedApiExercise.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '2px' }}>
                      {selectedApiExercise.primaryMuscles.map(m => MUSCLE_LABELS[m] || m).join(', ')}
                    </div>
                  </div>
                  <button onClick={() => { setShowAddExerciseModal(false); setSelectedApiExercise(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                  {/* Image Slideshow */}
                  {selectedApiExercise.images.length > 0 && (
                    <div style={{ margin: '16px 0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', position: 'relative' }}>
                      <img
                        key={imageIdx}
                        src={`${DB_BASE}/exercises/${selectedApiExercise.images[imageIdx]}`}
                        alt={selectedApiExercise.name}
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transition: 'opacity 0.4s ease' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {/* Slide indicator dots */}
                      {selectedApiExercise.images.length > 1 && (
                        <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px' }}>
                          {selectedApiExercise.images.map((_, i) => (
                            <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: imageIdx === i ? 'var(--accent-color)' : 'rgba(0,0,0,0.2)', transition: 'background 0.3s' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meta badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                    {[
                      { label: selectedApiExercise.level, color: selectedApiExercise.level === 'beginner' ? '#10b981' : selectedApiExercise.level === 'intermediate' ? '#f59e0b' : '#ef4444' },
                      { label: selectedApiExercise.equipment, color: 'var(--accent-color)' },
                      ...(selectedApiExercise.force ? [{ label: selectedApiExercise.force, color: 'var(--text-secondary)' }] : []),
                    ].map((badge) => (
                      <span key={badge.label} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.03)', border: `1px solid ${badge.color}20`, color: badge.color, textTransform: 'capitalize' }}>
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  {/* Muscles */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Músculos</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedApiExercise.primaryMuscles.map(m => (
                        <span key={m} style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'rgba(255,94,58,0.08)', color: 'var(--accent-color)', border: '1px solid rgba(255,94,58,0.2)' }}>
                          {MUSCLE_LABELS[m] || m}
                        </span>
                      ))}
                      {selectedApiExercise.secondaryMuscles.map(m => (
                        <span key={m} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '10px', backgroundColor: '#f1f5f9', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                          {MUSCLE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Instructions */}
                  {selectedApiExercise.instructions.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Execução</div>
                      <ol style={{ paddingLeft: '0', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none' }}>
                        {selectedApiExercise.instructions.map((step, i) => (
                          <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(255,94,58,0.08)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', marginTop: '1px' }}>{i + 1}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Add button */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddExercise(selectedApiExercise)}
                    style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
                  >
                    <Plus size={16} /> Adicionar ao Treino
                  </button>
                </div>
              </div>

            ) : (
              // ── Exercise List View ──
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Exercícios</h3>
                    <button onClick={() => { setShowAddExerciseModal(false); setSearchQuery(''); setMuscleFilter('all'); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Search */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Pesquisar exercício ou músculo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                      autoFocus
                    />
                  </div>

                  {/* Muscle Filters */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {[{ key: 'all', label: 'Todos' }, ...ALL_FILTER_MUSCLES.map(m => ({ key: m, label: MUSCLE_LABELS[m] || m }))].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setMuscleFilter(key)}
                        style={{
                          flexShrink: 0, fontSize: '0.7rem', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all var(--transition-fast)',
                          backgroundColor: muscleFilter === key ? 'var(--accent-color)' : 'transparent',
                          borderColor: muscleFilter === key ? 'var(--accent-color)' : 'var(--border-color)',
                          color: muscleFilter === key ? '#fff' : 'var(--text-secondary)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                  {/* Local custom exercises */}
                  {filteredLocalExercises.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Personalizados</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filteredLocalExercises.map(ex => {
                          const added = activeWorkout.exercises.some(a => a.id === ex.id);
                          return (
                            <button key={ex.id} disabled={added} onClick={() => handleAddExercise(ex)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: added ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', cursor: added ? 'not-allowed' : 'pointer', color: added ? 'var(--text-muted)' : 'var(--text-primary)', textAlign: 'left' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ex.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ex.category}</div>
                              </div>
                              {added ? <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Adicionado</span> : <Plus size={16} style={{ color: 'var(--accent-color)' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* API Exercises */}
                  {apiLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px 0', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: '0.85rem' }}>A carregar exercícios...</span>
                    </div>
                  ) : apiError ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '30px 0', fontSize: '0.85rem' }}>
                      Sem ligação à internet.<br />Os exercícios personalizados continuam disponíveis.
                    </div>
                  ) : (
                    <>
                      {filteredApiExercises.length > 0 && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                          Base de Dados ({filteredApiExercises.length})
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filteredApiExercises.map(ex => {
                          const added = activeWorkout.exercises.some(a => a.id === ex.id);
                          return (
                            <button
                              key={ex.id}
                              onClick={() => setSelectedApiExercise(ex)}
                              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', borderRadius: '14px', border: '1px solid var(--border-color)', background: added ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                            >
                              {/* Thumbnail — bigger and taller */}
                              <div style={{ width: '80px', height: '72px', borderRadius: '10px', backgroundColor: '#f1f5f9', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                  src={`${DB_BASE}/exercises/${ex.images[0]}`}
                                  alt={ex.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    const el = e.currentTarget;
                                    el.style.display = 'none';
                                    el.parentElement!.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M6.5 6.5h11M6.5 17.5h11M12 2v20"/></svg></div>';
                                  }}
                                />
                              </div>
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: added ? 'var(--success)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{translateExerciseName(ex.name)}</div>
                                <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: 'italic' }}>{ex.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{ex.primaryMuscles.map(m => MUSCLE_LABELS[m] || m).join(', ')}</div>
                              </div>
                              {/* Action */}
                              {added ? (
                                <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                              ) : (
                                <Info size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                              )}
                            </button>
                          );
                        })}
                        {filteredApiExercises.length === 0 && !apiLoading && (
                          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: '0.85rem' }}>Nenhum exercício encontrado.</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
