import React, { useState, useEffect, useMemo } from 'react';
import type { Workout, Exercise, WorkoutExercise, Set, SetType, AppSettings, WorkoutTemplate, PersonalRecord } from '../types';
import { Plus, Trash2, Check, X, Dumbbell, ChevronLeft, Search, Info, Bookmark, SlidersHorizontal, List, Eye, Timer, Zap, Trophy, Edit2, ChevronDown, GripVertical, ChevronsUpDown } from 'lucide-react';
import { translateExerciseName, filterExercisesBySearch, getExerciseCategory, matchesCategoryFilter } from '../utils/translateExercise';
import { isDoubleDumbbellExercise, getExerciseWeightMultiplier, resolveExerciseMediaId } from '../utils/exerciseUtils';
import { StaticExerciseImage } from './StaticExerciseImage';
import { RoutinePreviewModal } from './RoutinePreviewModal';
import { CreateRoutineModal } from './CreateRoutineModal';
import { useLongPress } from '../utils/useLongPress';

export const SET_TYPE_OPTIONS: { type: SetType; label: string; badge: string; desc: string; color: string; bg: string; border: string }[] = [
  { type: 'normal', label: 'Série Normal', badge: 'N', desc: 'Série de trabalho padrão', color: 'var(--text-primary)', bg: 'var(--bg-secondary)', border: 'var(--border-color)' },
  { type: 'dropset', label: 'Drop Set', badge: 'D', desc: 'Reduzir carga sem descanso', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)' },
  { type: 'right', label: 'Braço / Lado Direito', badge: 'Dir', desc: 'Execução unilateral direita', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  { type: 'left', label: 'Braço / Lado Esquerdo', badge: 'Esq', desc: 'Execução unilateral esquerda', color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.3)' },
  { type: 'warmup', label: 'Aquecimento', badge: 'W', desc: 'Série de ativação / leve', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { type: 'failure', label: 'Até à Falha', badge: 'F', desc: 'Repetições máximas até falhar', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
];

// ─── Free Exercise DB types ───────────────────────────────────────────────────
interface ApiExercise {
  id: string;
  name: string;
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  instructions: string[];
}

const DB_JSON = '/exercises.json';

// Global in-memory cache so exercises.json is loaded once in the background and instant forever
let cachedApiExercises: ApiExercise[] | null = null;
let fetchPromise: Promise<ApiExercise[]> | null = null;

export const preloadExercises = (): Promise<ApiExercise[]> => {
  if (cachedApiExercises) return Promise.resolve(cachedApiExercises);
  if (!fetchPromise) {
    fetchPromise = fetch(DB_JSON)
      .then(r => r.json())
      .then((data: ApiExercise[]) => {
        cachedApiExercises = data;
        return data;
      })
      .catch(err => {
        console.error('Failed to preload exercises:', err);
        fetchPromise = null;
        return [];
      });
  }
  return fetchPromise;
};

// Trigger background preload immediately on script load
if (typeof window !== 'undefined') {
  preloadExercises();
}

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Peito',
  arms: 'Braços',
  shoulders: 'Ombros',
  back: 'Costas',
  abdominals: 'Abs',
  legs: 'Pernas',
  // Individual muscles fallback translations
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  glutes: 'Glúteos',
  quadriceps: 'Quadríceps',
  hamstrings: 'Isquiotibiais',
  calves: 'Gémeos',
  forearms: 'Antebraço',
  lats: 'Dorsais',
  traps: 'Trapézio',
};

const mapCategory = (muscleGroup: string): string => {
  const lower = (muscleGroup || '').toLowerCase();
  if (lower === 'chest') return 'Peito';
  if (lower === 'biceps' || lower === 'triceps' || lower === 'forearms') return 'Braços';
  if (lower === 'shoulders' || lower === 'deltoids') return 'Ombros';
  if (lower === 'back' || lower === 'lats' || lower === 'traps' || lower === 'upper back' || lower === 'lower back') return 'Costas';
  if (lower === 'abdominals' || lower === 'core' || lower === 'obliques') return 'Core';
  if (lower === 'quadriceps' || lower === 'hamstrings' || lower === 'glutes' || lower === 'calves') return 'Pernas';
  return MUSCLE_LABELS[lower] || muscleGroup || 'Outro';
};

const ALL_FILTER_MUSCLES = [
  'chest', 'arms', 'shoulders', 'back', 'abdominals', 'legs',
];



const MUSCLE_ZOOM_MAPPING: Record<string, { scale: number; origin: string }> = {
  chest: { scale: 1.6, origin: 'center 28%' },
  arms: { scale: 1.5, origin: 'center 34%' },
  shoulders: { scale: 1.7, origin: 'center 22%' },
  abdominals: { scale: 1.6, origin: 'center 38%' },
  back: { scale: 1.6, origin: 'center 28%' },
  legs: { scale: 1.4, origin: 'center 68%' },
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface WorkoutLogProps {
  activeWorkout: Workout | null;
  exercises: Exercise[];
  prs?: PersonalRecord[];
  settings: AppSettings;
  templates: WorkoutTemplate[];
  workouts: Workout[];
  onUpdateWorkout: (workout: Workout) => void;
  onSaveWorkout: () => void;
  onCancelWorkout: () => void;
  onStartWorkout: () => void;
  onAddTemplate: (name: string, exercises: WorkoutExercise[], templateId?: string) => void;
  onDeleteTemplate: (id: string) => void;
  onStartWorkoutFromTemplate: (template: WorkoutTemplate) => void;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({
  activeWorkout,
  exercises,
  prs = [],
  settings,
  templates,
  workouts,
  onUpdateWorkout,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCancelWorkout: _onCancelWorkout,
  onStartWorkout,
  onAddTemplate,
  onDeleteTemplate,
  onStartWorkoutFromTemplate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaveWorkout: _onSaveWorkout,
}) => {
  // Live Volume Calculation for the active workout
  const liveVolume = useMemo(() => {
    if (!activeWorkout || !activeWorkout.exercises) return 0;
    return activeWorkout.exercises.reduce((total, ex) => {
      if (!ex || !ex.sets) return total;
      const mult = getExerciseWeightMultiplier(ex);
      return total + ex.sets
        .filter(s => s && s.isCompleted)
        .reduce((s, set) => s + ((Number(set.weight) || 0) * mult) * (Number(set.reps) || 0), 0);
    }, 0);
  }, [activeWorkout]);

  // Live PRs count calculation for the active workout
  const livePRsCount = useMemo(() => {
    if (!activeWorkout || !activeWorkout.exercises) return 0;
    let count = 0;

    activeWorkout.exercises.forEach(ex => {
      const completedSets = (ex.sets || []).filter(s => s && s.isCompleted);
      if (completedSets.length === 0) return;

      // Best set in current workout (highest weight, or reps tiebreaker)
      let currentBest = completedSets[0];
      completedSets.forEach(s => {
        const sw = Number(s.weight) || 0;
        const sr = Number(s.reps) || 0;
        const bw = Number(currentBest.weight) || 0;
        const br = Number(currentBest.reps) || 0;
        if (sw > bw || (sw === bw && sr > br)) {
          currentBest = s;
        }
      });

      const currWeight = Number(currentBest.weight) || 0;
      const currReps = Number(currentBest.reps) || 0;
      if (currWeight <= 0 && currReps <= 0) return;

      // Find highest previous record
      let pastMaxWeight = 0;
      let pastMaxRepsAtMaxWeight = 0;
      let hadPastRecord = false;

      (prs || []).filter(p => p.exerciseId === ex.id || p.exerciseName?.toLowerCase() === ex.name?.toLowerCase()).forEach(p => {
        hadPastRecord = true;
        const pw = Number(p.weight) || 0;
        const pr = Number(p.reps) || 0;
        if (pw > pastMaxWeight || (pw === pastMaxWeight && pr > pastMaxRepsAtMaxWeight)) {
          pastMaxWeight = pw;
          pastMaxRepsAtMaxWeight = pr;
        }
      });

      (workouts || []).filter(w => w.id !== activeWorkout.id).forEach(w => {
        (w.exercises || []).filter(we => we.id === ex.id || we.name?.toLowerCase() === ex.name?.toLowerCase()).forEach(we => {
          (we.sets || []).filter(s => s && s.isCompleted).forEach(s => {
            hadPastRecord = true;
            const sw = Number(s.weight) || 0;
            const sr = Number(s.reps) || 0;
            if (sw > pastMaxWeight || (sw === pastMaxWeight && sr > pastMaxRepsAtMaxWeight)) {
              pastMaxWeight = sw;
              pastMaxRepsAtMaxWeight = sr;
            }
          });
        });
      });

      if (hadPastRecord) {
        if (currWeight > pastMaxWeight || (currWeight === pastMaxWeight && currReps > pastMaxRepsAtMaxWeight)) {
          count++;
        }
      }
    });

    return count;
  }, [activeWorkout, prs, workouts]);

  const liveVolumeFormatted = useMemo(() => {
    if (liveVolume >= 10000) {
      return { value: (liveVolume / 1000).toFixed(1), unit: 'ton' };
    }
    return { value: Math.round(liveVolume).toLocaleString('pt-PT'), unit: 'kg' };
  }, [liveVolume]);

  const { completedSetsCount, totalSetsCount } = useMemo(() => {
    if (!activeWorkout?.exercises) return { completedSetsCount: 0, totalSetsCount: 0 };
    let completed = 0;
    let total = 0;
    activeWorkout.exercises.forEach(ex => {
      (ex.sets || []).forEach(s => {
        total++;
        if (s.isCompleted) completed++;
      });
    });
    return { completedSetsCount: completed, totalSetsCount: total };
  }, [activeWorkout]);

  const startTimeFormatted = useMemo(() => {
    if (!activeWorkout?.date) return '';
    try {
      const d = new Date(activeWorkout.date);
      return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [activeWorkout?.date]);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [selectedApiExercise, setSelectedApiExercise] = useState<ApiExercise | null>(null);
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>(() => cachedApiExercises || []);
  const [apiLoading, setApiLoading] = useState(() => !cachedApiExercises);
  const [apiError, setApiError] = useState(false);

  // Set type picker state (Dropset, Right arm, Left arm, Warmup, Failure, Normal)
  const [activeSetTypePicker, setActiveSetTypePicker] = useState<{ exerciseId: string; setId: string; currentType: SetType; setIndex: number } | null>(null);

  // Bookmarked exercises state
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('strongpr_bookmarked_exercises');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('strongpr_bookmarked_exercises', JSON.stringify(next));
      return next;
    });
  };

  // Template creation / exercise multi-select state
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // Accordion push-down state for exercises in active workout
  const [expandedExerciseIds, setExpandedExerciseIds] = useState<Record<string, boolean>>({});
  const [draggingExerciseIdx, setDraggingExerciseIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const toggleExerciseExpanded = (id: string) => {
    setExpandedExerciseIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllExercisesExpanded = () => {
    if (!activeWorkout || !activeWorkout.exercises) return;
    const allExpanded = activeWorkout.exercises.every(e => Boolean(expandedExerciseIds[e.id]));
    const nextState: Record<string, boolean> = {};
    activeWorkout.exercises.forEach(e => {
      nextState[e.id] = !allExpanded;
    });
    setExpandedExerciseIds(nextState);
  };

  const reorderExercises = (fromIndex: number, toIndex: number) => {
    if (!activeWorkout || fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const list = [...(activeWorkout.exercises || [])];
    if (fromIndex >= list.length || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    onUpdateWorkout({
      ...activeWorkout,
      exercises: list
    });
  };

  // Touch reordering refs and handlers
  const touchStartY = React.useRef<number>(0);
  const touchActiveIdx = React.useRef<number | null>(null);
  const exerciseContainerRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchActiveIdx.current = idx;
    setDraggingExerciseIdx(idx);
    setDragOverIdx(idx);
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(20);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchActiveIdx.current === null) return;
    const currentY = e.touches[0].clientY;
    const activeIdx = touchActiveIdx.current;
    for (let i = 0; i < exerciseContainerRefs.current.length; i++) {
      const el = exerciseContainerRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        if (currentY >= rect.top && currentY <= rect.bottom) {
          if (i !== activeIdx) {
            reorderExercises(activeIdx, i);
            touchActiveIdx.current = i;
            setDraggingExerciseIdx(i);
            setDragOverIdx(i);
            if (window.navigator?.vibrate) {
              window.navigator.vibrate(10);
            }
          }
          break;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    touchActiveIdx.current = null;
    setDraggingExerciseIdx(null);
    setDragOverIdx(null);
  };

  // Desktop drag handlers
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingExerciseIdx(idx);
  };

  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (toIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggingExerciseIdx !== null && draggingExerciseIdx !== toIdx) {
      reorderExercises(draggingExerciseIdx, toIdx);
    }
    setDraggingExerciseIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggingExerciseIdx(null);
    setDragOverIdx(null);
  };

  // Auto-expand current active exercise when starting or changing workout
  const activeWorkoutId = activeWorkout?.id;
  useEffect(() => {
    if (!activeWorkout || !activeWorkout.exercises || activeWorkout.exercises.length === 0) return;
    setExpandedExerciseIds(prev => {
      // If user has already opened or closed an exercise manually during this workout, preserve state
      if (Object.keys(prev).length > 0) return prev;
      
      // Otherwise, open the first exercise with incomplete sets
      const firstIncomplete = activeWorkout.exercises.find(
        e => (e.sets || []).some(s => !s.isCompleted)
      ) || activeWorkout.exercises[0];

      if (firstIncomplete) {
        return { [firstIncomplete.id]: true };
      }
      return prev;
    });
  }, [activeWorkoutId]);

  const { bind: bindRoutineLongPress } = useLongPress<WorkoutTemplate>({
    onLongPress: (template) => {
      window.customConfirm(
        'Eliminar Rotina',
        `Tens a certeza que desejas eliminar a rotina "${template.name}"?`,
        () => onDeleteTemplate(template.id)
      );
    },
    onClick: (template) => {
      setPreviewTemplate(template);
    }
  });

  // Helper to fetch recently performed or popular exercises
  const getRecentExercises = () => {
    const recents: ApiExercise[] = [];
    const seenIds = new Set<string>();

    if (workouts && workouts.length > 0) {
      const sortedWorkouts = [...workouts].filter(w => w && w.date).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      for (const w of sortedWorkouts) {
        for (const ex of (w?.exercises || [])) {
          if (ex && !seenIds.has(ex.id)) {
            seenIds.add(ex.id);
            const apiEx = apiExercises.find(e => e.id === ex.id);
            if (apiEx) recents.push(apiEx);
          }
        }
      }
    }

    // Default popular exercises list to pre-populate (Bench Press, Bicep Curl, Shoulder Press, Pullup, Deadlift, Squat)
    if (recents.length < 4) {
      const popularIds = ['0025', '0313', '0086', '0652', '0032', '0043'];
      for (const id of popularIds) {
        if (!seenIds.has(id)) {
          const apiEx = apiExercises.find(e => e.id === id);
          if (apiEx) {
            recents.push(apiEx);
            seenIds.add(id);
          }
        }
      }
    }

    return recents.slice(0, 6);
  };

  // Rest timer target end timestamp (wall-clock based)
  const [restEndTime, setRestEndTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('strongpr_rest_end_time');
      if (saved) {
        const time = Number(saved);
        if (time > Date.now()) return time;
      }
    } catch {}
    return null;
  });

  const [restDuration, setRestDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('strongpr_rest_duration');
      if (saved) return Number(saved) || settings.defaultRestDuration;
    } catch {}
    return settings.defaultRestDuration;
  });

  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('strongpr_rest_end_time');
      if (saved) {
        const time = Number(saved);
        const left = Math.ceil((time - Date.now()) / 1000);
        if (left > 0) return left;
      }
    } catch {}
    return null;
  });

  // Elapsed workout time (wall-clock based)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Shared AudioContext for zero-latency, reliably unlocked notification beeps
  const getAudioContext = (): AudioContext | null => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return null;
      if (!(window as any).__strongpr_audio_ctx) {
        (window as any).__strongpr_audio_ctx = new AudioCtxClass();
      }
      const ctx = (window as any).__strongpr_audio_ctx as AudioContext;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  };

  const scheduleServiceWorkerRestTimer = (endTime: number) => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_REST_TIMER',
          endTime,
          title: 'Tempo de Descanso Concluído! ⏱️',
          body: 'Está na hora de começares a próxima série!'
        });
      }
    } catch {}
  };

  const cancelServiceWorkerRestTimer = () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CANCEL_REST_TIMER'
        });
      }
    } catch {}
  };

  // Screen WakeLock to prevent screen auto-sleep during active workouts
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestLock = async () => {
      try {
        if ('wakeLock' in navigator && activeWorkout && document.visibilityState === 'visible') {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };

    if (activeWorkout) {
      requestLock();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && activeWorkout) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockSentinel) {
        try { wakeLockSentinel.release(); } catch {}
      }
    };
  }, [activeWorkout]);

  // Helper functions for Rest Timer
  const startRestTimer = (seconds: number) => {
    getAudioContext();
    const endTime = Date.now() + seconds * 1000;
    setRestDuration(seconds);
    setRestEndTime(endTime);
    setRestTimeLeft(seconds);
    scheduleServiceWorkerRestTimer(endTime);
    try {
      localStorage.setItem('strongpr_rest_end_time', endTime.toString());
      localStorage.setItem('strongpr_rest_duration', seconds.toString());
    } catch {}
  };

  const addRestTime = (additionalSeconds: number) => {
    getAudioContext();
    const currentEnd = restEndTime && restEndTime > Date.now() ? restEndTime : Date.now();
    const newEnd = currentEnd + additionalSeconds * 1000;
    const newDuration = (restDuration || settings.defaultRestDuration) + additionalSeconds;
    const newLeft = Math.ceil((newEnd - Date.now()) / 1000);
    setRestDuration(newDuration);
    setRestEndTime(newEnd);
    setRestTimeLeft(newLeft);
    scheduleServiceWorkerRestTimer(newEnd);
    try {
      localStorage.setItem('strongpr_rest_end_time', newEnd.toString());
      localStorage.setItem('strongpr_rest_duration', newDuration.toString());
    } catch {}
  };

  const clearRestTimer = () => {
    setRestEndTime(null);
    setRestTimeLeft(null);
    cancelServiceWorkerRestTimer();
    try {
      localStorage.removeItem('strongpr_rest_end_time');
      localStorage.removeItem('strongpr_rest_duration');
    } catch {}
  };

  // Synchronized workout & rest timer loop with visibility & focus sync
  useEffect(() => {
    const updateTimers = () => {
      // 1. Workout Elapsed Time (Real Wall-Clock)
      if (activeWorkout) {
        const startTime = activeWorkout.date ? new Date(activeWorkout.date).getTime() : Date.now();
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(seconds >= 0 ? seconds : 0);
      } else {
        setElapsedSeconds(0);
      }

      // 2. Rest Timer Countdown (Real Wall-Clock)
      if (restEndTime) {
        const diff = restEndTime - Date.now();
        if (diff <= 0) {
          const expiredSecondsAgo = Math.abs(diff) / 1000;
          // Only fire foreground sound/vibe if it expired in the last 2.5 seconds in foreground
          // If expired long ago while sleeping, do not fire delayed annoying notifications
          if (expiredSecondsAgo <= 2.5) {
            triggerRestEndNotifications();
          }
          clearRestTimer();
        } else {
          setRestTimeLeft(Math.ceil(diff / 1000));
        }
      }
    };

    updateTimers();
    const interval = window.setInterval(updateTimers, 1000);

    const handleVisibilityChange = () => {
      updateTimers();
    };

    const handleFocus = () => {
      updateTimers();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeWorkout, restEndTime]);

  // Save elapsed duration on each tick
  useEffect(() => {
    if (activeWorkout && elapsedSeconds > 0) {
      onUpdateWorkout({ ...activeWorkout, duration: elapsedSeconds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds]);

  // Populate exercises from background preloader
  useEffect(() => {
    if (apiExercises.length > 0) return;
    preloadExercises().then((data) => {
      setApiExercises(data);
      setApiLoading(false);
    }).catch(() => {
      setApiError(true);
      setApiLoading(false);
    });
  }, [apiExercises.length]);

  const triggerRestEndNotifications = () => {
    if (settings.enableVibration && 'vibrate' in navigator) {
      try { navigator.vibrate([250, 100, 250, 100, 250]); } catch {}
    }
    if (settings.enableSound) {
      try {
        const audioCtx = getAudioContext();
        if (audioCtx) {
          const playBeep = (time: number, freq: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
            osc.start(time);
            osc.stop(time + 0.18);
          };
          const now = audioCtx.currentTime;
          playBeep(now, 880);
          playBeep(now + 0.22, 1174.66);
        }
      } catch (err) { console.error('Audio beep error', err); }
    }

    // System Push Notification if app is in background
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      const title = 'Tempo de Descanso Concluído! ⏱️';
      const body = 'Está na hora de começares a próxima série!';
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'strongpr-rest-timer',
            renotify: true,
            vibrate: [250, 100, 250, 100, 250]
          } as any);
        }).catch(() => {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: 'strongpr-rest-timer',
            renotify: true
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          tag: 'strongpr-rest-timer',
          renotify: true
        } as any);
      }
    }
  };

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Combine local custom exercises + filter API exercises
  const localExercises = useMemo(() => exercises.filter(ex => ex.isCustom), [exercises]);

  const filteredApiExercises = useMemo(() => {
    const base = searchQuery.trim() !== ''
      ? apiExercises
      : apiExercises.filter(ex => muscleFilter === 'bookmarked' 
          ? bookmarkedIds.includes(ex.id)
          : matchesCategoryFilter(ex, muscleFilter));
    return filterExercisesBySearch(base, searchQuery);
  }, [apiExercises, muscleFilter, bookmarkedIds, searchQuery]);

  const filteredLocalExercises = useMemo(() => {
    const base = searchQuery.trim() !== ''
      ? localExercises
      : localExercises.filter(ex => muscleFilter === 'bookmarked' 
          ? bookmarkedIds.includes(ex.id)
          : matchesCategoryFilter(ex, muscleFilter));
    return filterExercisesBySearch(base, searchQuery);
  }, [localExercises, muscleFilter, bookmarkedIds, searchQuery]);

  // Add multiple selected exercises to active workout
  const handleConfirmAddExercises = () => {
    if (selectedExerciseIds.length === 0) return;

    const exercisesToAdd = apiExercises.filter(ex => selectedExerciseIds.includes(ex.id));
    const newWorkoutExercises: WorkoutExercise[] = exercisesToAdd.map(exercise => {
      const category = getExerciseCategory(exercise);
      return {
        id: exercise.id,
        name: exercise.name,
        category,
        sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
      };
    });

    const localToAdd = localExercises.filter((ex: Exercise) => selectedExerciseIds.includes(ex.id));
    const newLocalWorkoutExercises: WorkoutExercise[] = localToAdd.map((exercise: Exercise) => ({
      id: exercise.id,
      name: exercise.name,
      category: getExerciseCategory(exercise),
      sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
    }));

    if (!activeWorkout) return;
    const newExpanded = { ...expandedExerciseIds };
    newWorkoutExercises.forEach(e => { newExpanded[e.id] = true; });
    newLocalWorkoutExercises.forEach(e => { newExpanded[e.id] = true; });
    setExpandedExerciseIds(newExpanded);

    onUpdateWorkout({
      ...activeWorkout,
      exercises: [
        ...(activeWorkout.exercises || []),
        ...newWorkoutExercises,
        ...newLocalWorkoutExercises,
      ],
    });

    setShowAddExerciseModal(false);
    setSelectedExerciseIds([]);
    setSearchQuery('');
    setMuscleFilter('all');
  };

  // Add single exercise directly (fallback)
  const handleAddExercise = (exercise: Exercise | ApiExercise) => {
    if (!activeWorkout) return;
    const id = exercise.id;
    if ((activeWorkout.exercises || []).some((e) => e.id === id)) {
      setShowAddExerciseModal(false);
      return;
    }

    const category = getExerciseCategory(exercise);

    const newWorkoutExercise: WorkoutExercise = {
      id,
      name: exercise.name,
      category,
      sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
    };
    setExpandedExerciseIds(prev => ({ ...prev, [newWorkoutExercise.id]: true }));
    onUpdateWorkout({ ...activeWorkout, exercises: [...(activeWorkout.exercises || []), newWorkoutExercise] });
    setShowAddExerciseModal(false);
    setSelectedApiExercise(null);
    setSelectedExerciseIds([]);
    setSearchQuery('');
    setMuscleFilter('all');
  };

  const toggleExerciseSelection = (id: string) => {
    setSelectedExerciseIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRemoveExercise = (exerciseId: string) => {
    window.customConfirm(
      'Remover Exercício',
      'Tem a certeza que deseja remover este exercício do treino atual?',
      () => {
        if (!activeWorkout) return;
        onUpdateWorkout({
          ...activeWorkout,
          exercises: (activeWorkout.exercises || []).filter((e) => e.id !== exerciseId),
        });
      }
    );
  };

  const handleAddSet = (exerciseId: string) => {
    if (!activeWorkout) return;
    onUpdateWorkout({
      ...activeWorkout,
      exercises: (activeWorkout.exercises || []).map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets && ex.sets.length > 0 ? ex.sets[ex.sets.length - 1] : undefined;
        return {
          ...ex,
          sets: [...(ex.sets || []), { id: Math.random().toString(36).substring(2, 9), weight: lastSet?.weight || 0, reps: lastSet?.reps || 0, isCompleted: false }],
        };
      }),
    });
  };

  const handleRemoveSet = (exerciseId: string, setId: string) => {
    if (!activeWorkout) return;
    onUpdateWorkout({
      ...activeWorkout,
      exercises: (activeWorkout.exercises || []).map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const updatedSets = (ex.sets || []).filter((s) => s.id !== setId);
        return { ...ex, sets: updatedSets.length > 0 ? updatedSets : [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }] };
      }),
    });
  };

  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<Set>) => {
    if (!activeWorkout) return;

    // Se concluiu uma série, verifica se todas as séries deste exercício ficaram completas
    if (updates.isCompleted === true) {
      const targetExercise = (activeWorkout.exercises || []).find((e) => e.id === exerciseId);
      if (targetExercise) {
        const willBeAllCompleted = (targetExercise.sets || []).every((s) =>
          s.id === setId ? true : s.isCompleted
        );

        if (willBeAllCompleted) {
          const currentIndex = (activeWorkout.exercises || []).findIndex((e) => e.id === exerciseId);
          const nextExercise = (activeWorkout.exercises || [])[currentIndex + 1];

          // Fecha o exercício atual e abre o seguinte suavemente
          setTimeout(() => {
            setExpandedExerciseIds((prev) => {
              const updated = { ...prev, [exerciseId]: false };
              if (nextExercise) {
                updated[nextExercise.id] = true;
              }
              return updated;
            });
          }, 280);
        }
      }
    }

    onUpdateWorkout({
      ...activeWorkout,
      exercises: (activeWorkout.exercises || []).map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: (ex.sets || []).map((s) => {
            if (s.id !== setId) return s;
            if (updates.isCompleted === true && !s.isCompleted) {
              startRestTimer(settings.defaultRestDuration);

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

  if (!activeWorkout) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Iniciar Treino</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
              Escolhe uma rotina ou começa do zero.
            </p>
          </div>
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => setShowCreateTemplateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
          >
            <Plus size={16} /> Criar Rotina
          </button>
        </div>

        {/* Quick Start Blank Workout Banner */}
        <div 
          className="interactive" 
          onClick={onStartWorkout}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '16px', 
            padding: '22px 20px', 
            cursor: 'pointer', 
            background: 'linear-gradient(135deg, rgba(91, 94, 244, 0.1) 0%, rgba(123, 127, 245, 0.05) 100%)',
            border: '1px solid rgba(91, 94, 244, 0.25)',
            borderRadius: '20px',
            boxShadow: '0 4px 18px var(--accent-glow)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', padding: '12px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: '#ffffff', boxShadow: '0 4px 14px var(--accent-glow)' }}>
              <Plus size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Iniciar Treino Vazio</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>Regista um treino livre adicionando os exercícios</p>
            </div>
          </div>
        </div>

        {/* Templates Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              As Tuas Rotinas ({templates.length})
            </h3>
          </div>
          
          {templates.length === 0 ? (
            <div className="glass-card" style={{ padding: '24px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '18px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Ainda não tens rotinas criadas.
              </p>
              <button 
                className="btn btn-secondary btn-small"
                onClick={() => setShowCreateTemplateModal(true)}
                style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> Criar Rotina
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className="glass-card" 
                  {...bindRoutineLongPress(template)}
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginBottom: 0,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    WebkitTouchCallout: 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {template.name}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                        {template.exercises.map((ex: any) => translateExerciseName(ex.name)).join(' • ')}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.customConfirm(
                          'Eliminar Rotina',
                          `Tens a certeza que desejas eliminar a rotina "${template.name}"?`,
                          () => onDeleteTemplate(template.id)
                        );
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowCreateTemplateModal(true);
                      }}
                      title="Editar rotina"
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <Edit2 size={16} /> Editar
                    </button>
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPreviewTemplate(template)}
                      style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <Eye size={16} /> Ver
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => onStartWorkoutFromTemplate(template)}
                      style={{ flex: 1, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem' }}
                    >
                      <Dumbbell size={18} /> Iniciar Treino
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create or Edit Routine */}
        <CreateRoutineModal
          isOpen={showCreateTemplateModal}
          onClose={() => {
            setShowCreateTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={(name, exList, tId) => {
            onAddTemplate(name, exList, tId);
            setShowCreateTemplateModal(false);
            setEditingTemplate(null);
          }}
          exercises={exercises}
          initialTemplate={editingTemplate}
        />

        {/* Modal: Routine Preview */}
        {previewTemplate && (
          <RoutinePreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onStartWorkout={onStartWorkoutFromTemplate}
            onEdit={(t) => {
              setPreviewTemplate(null);
              setEditingTemplate(t);
              setShowCreateTemplateModal(true);
            }}
          />
        )}

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Active Workout Header & Professional Live HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Workout Name & Status Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <input
              type="text"
              className="form-input"
              value={activeWorkout?.name || ''}
              onChange={(e) => activeWorkout && onUpdateWorkout({ ...activeWorkout, name: e.target.value })}
              style={{
                fontSize: '1.35rem',
                fontWeight: 850,
                fontFamily: 'var(--font-display)',
                background: 'transparent',
                border: 'none',
                padding: '0',
                width: '100%',
                borderBottom: '1.5px dashed transparent',
                borderRadius: 0,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                transition: 'border-color 0.2s'
              }}
              placeholder="Nome do Treino"
              onFocus={(e) => e.target.style.borderBottom = '1.5px dashed var(--accent-color)'}
              onBlur={(e) => e.target.style.borderBottom = '1.5px dashed transparent'}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                display: 'inline-block', 
                width: '7px', 
                height: '7px', 
                backgroundColor: '#10b981', 
                borderRadius: '50%', 
                boxShadow: '0 0 8px #10b981',
                animation: 'pulse 2s infinite'
              }} />
              <span style={{ fontWeight: 600 }}>Treino em curso</span>
              {startTimeFormatted && (
                <>
                  <span style={{ opacity: 0.4 }}>•</span>
                  <span>Iniciado às {startTimeFormatted}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Sets Progress Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 10px',
            borderRadius: '12px',
            backgroundColor: 'rgba(91, 94, 244, 0.08)',
            border: '1px solid rgba(91, 94, 244, 0.15)',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--accent-color)',
            flexShrink: 0
          }}>
            <span>{completedSetsCount}/{totalSetsCount} séries</span>
          </div>
        </div>

        {/* Live HUD Dashboard Grid (3 Columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          background: 'var(--bg-card)',
          padding: '12px 10px',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          {/* 1. Duração / Tempo */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Timer size={13} color="var(--accent-color)" />
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tempo
              </span>
            </div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.15rem', 
              fontWeight: 900, 
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {formatElapsed(elapsedSeconds)}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
              duração
            </div>
          </div>

          {/* 2. Volume Total */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Zap size={13} color="#00B2FE" />
              <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Volume
              </span>
            </div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.15rem', 
              fontWeight: 900, 
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {liveVolumeFormatted.value}
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '2px' }}>
                {liveVolumeFormatted.unit}
              </span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
              carga total
            </div>
          </div>

          {/* 3. Recordes (PRs) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 4px',
            borderRadius: '12px',
            background: livePRsCount > 0 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-secondary)',
            border: livePRsCount > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            boxShadow: livePRsCount > 0 ? '0 2px 10px rgba(245, 158, 11, 0.15)' : 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Trophy size={13} color={livePRsCount > 0 ? '#D97706' : 'var(--text-muted)'} />
              <span style={{ 
                fontSize: '0.62rem', 
                fontWeight: 800, 
                color: livePRsCount > 0 ? '#D97706' : 'var(--text-secondary)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em' 
              }}>
                Recordes
              </span>
            </div>
            <div style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.15rem', 
              fontWeight: 900, 
              color: livePRsCount > 0 ? '#D97706' : 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {livePRsCount}
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: livePRsCount > 0 ? '#D97706' : 'var(--text-muted)', marginLeft: '2px' }}>
                PR{livePRsCount === 1 ? '' : 's'}
              </span>
            </div>
            <div style={{ 
              fontSize: '0.6rem', 
              color: livePRsCount > 0 ? '#B45309' : 'var(--text-muted)', 
              fontWeight: livePRsCount > 0 ? 800 : 600, 
              marginTop: '2px' 
            }}>
              {livePRsCount > 0 ? '🔥 Novo PR!' : 'superados'}
            </div>
          </div>
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
                onClick={() => addRestTime(30)}
                style={{ backgroundColor: 'rgba(255, 94, 58, 0.08)', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent-color)', cursor: 'pointer' }}
              >
                +30s
              </button>
              <button 
                onClick={() => clearRestTimer()}
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

      {/* Header with Exercise Count and Expand/Collapse All */}
      {activeWorkout && (activeWorkout.exercises || []).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Exercícios ({activeWorkout.exercises.length})
          </span>
          <button
            type="button"
            onClick={toggleAllExercisesExpanded}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-color)',
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderRadius: '6px',
            }}
          >
            <ChevronsUpDown size={14} />
            {activeWorkout.exercises.every(e => Boolean(expandedExerciseIds[e.id])) ? 'Recolher todos' : 'Expandir todos'}
          </button>
        </div>
      )}

      {/* Exercises with Drag & Reorder and Push-Down Sets Accordion */}
      {(activeWorkout?.exercises || []).map((workoutExercise, idx) => {
        const mediaId = resolveExerciseMediaId(workoutExercise, apiExercises);
        const isExpanded = Boolean(expandedExerciseIds[workoutExercise.id]);
        const completedSetsCount = (workoutExercise.sets || []).filter(s => s.isCompleted).length;
        const totalSetsCount = (workoutExercise.sets || []).length;
        const allCompleted = totalSetsCount > 0 && completedSetsCount === totalSetsCount;
        const isDragging = draggingExerciseIdx === idx;
        const isDragOver = dragOverIdx === idx && draggingExerciseIdx !== null && draggingExerciseIdx !== idx;

        return (
          <div
            key={workoutExercise.id}
            ref={(el) => { exerciseContainerRefs.current[idx] = el; }}
            className="glass-card"
            draggable={true}
            onDragStart={(e) => handleDragStart(idx, e)}
            onDragOver={(e) => handleDragOver(idx, e)}
            onDrop={(e) => handleDrop(idx, e)}
            onDragEnd={handleDragEnd}
            style={{
              padding: '16px',
              transition: 'all var(--transition-fast)',
              border: isDragging 
                ? '2px solid var(--accent-color)' 
                : isDragOver
                  ? '2px dashed var(--accent-color)'
                  : '1px solid var(--border-color)',
              backgroundColor: isDragging ? 'rgba(91,94,244,0.06)' : 'var(--bg-card)',
              transform: isDragging ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.14)' : '0 1px 4px rgba(0,0,0,0.04)',
              userSelect: isDragging ? 'none' : 'auto',
            }}
          >
            {/* Header: Drag Handle, Thumbnail, Info, Expand Chevron, Remove */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
              }}
              onClick={() => toggleExerciseExpanded(workoutExercise.id)}
            >
              {/* Drag Handle */}
              <div
                style={{
                  touchAction: 'none',
                  cursor: 'grab',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDragging ? 'var(--accent-color)' : 'var(--text-muted)',
                  padding: '6px 2px',
                  flexShrink: 0,
                }}
                title="Manter premido e deslizar para mudar a ordem"
                onTouchStart={(e) => handleTouchStart(idx, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical size={20} />
              </div>

              {/* Media Thumbnail */}
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {mediaId ? (
                  <StaticExerciseImage mediaId={mediaId} alt={workoutExercise.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                ) : (
                  <Dumbbell size={20} color="var(--accent-color)" opacity={0.4} />
                )}
              </div>

              {/* Title, Category & Sets Status Badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {translateExerciseName(workoutExercise.name)}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    {workoutExercise.category}
                  </span>
                  {isDoubleDumbbellExercise(workoutExercise) && (
                    <span style={{ fontSize: '0.62rem', color: '#D97706', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1px 5px', borderRadius: '5px', fontWeight: 800 }}>
                      2× Halteres
                    </span>
                  )}
                  {/* Summary of sets badge */}
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '1px 7px',
                      borderRadius: '8px',
                      backgroundColor: allCompleted
                        ? 'rgba(16, 185, 129, 0.12)'
                        : completedSetsCount > 0
                          ? 'rgba(91, 94, 244, 0.1)'
                          : 'var(--bg-secondary)',
                      color: allCompleted
                        ? '#10B981'
                        : completedSetsCount > 0
                          ? 'var(--accent-color)'
                          : 'var(--text-muted)',
                      border: allCompleted
                        ? '1px solid rgba(16, 185, 129, 0.25)'
                        : completedSetsCount > 0
                          ? '1px solid rgba(91, 94, 244, 0.2)'
                          : '1px solid var(--border-color)',
                    }}
                  >
                    {allCompleted
                      ? `✓ ${totalSetsCount}/${totalSetsCount}`
                      : completedSetsCount > 0
                        ? `${completedSetsCount}/${totalSetsCount} séries`
                        : `${totalSetsCount} série${totalSetsCount !== 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Action buttons on right: Chevron Down (Push-Down Accordion) + Remove */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExerciseExpanded(workoutExercise.id);
                  }}
                  title={isExpanded ? 'Recolher séries' : 'Ver séries (Push Down)'}
                  style={{
                    background: isExpanded ? 'rgba(91, 94, 244, 0.12)' : 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isExpanded ? 'var(--accent-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <ChevronDown
                    size={18}
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveExercise(workoutExercise.id);
                  }}
                  title="Remover exercício"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.7,
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Push Down / Accordion Content: Sets Table & Add Set */}
            {isExpanded && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                {/* Set headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '30px 1.2fr 1fr 34px', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ textAlign: 'center' }}>Série</span>
                  <span style={{ textAlign: 'center' }}>{isDoubleDumbbellExercise(workoutExercise) ? 'Peso (2×kg)' : 'Peso (kg)'}</span>
                  <span style={{ textAlign: 'center' }}>Reps</span>
                  <span style={{ textAlign: 'center' }}>OK</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {workoutExercise.sets.map((set, setIdx) => (
                    <div key={set.id} style={{ display: 'grid', gridTemplateColumns: '30px 1.2fr 1fr 34px', gap: '6px', alignItems: 'center', padding: '6px 8px', borderRadius: '10px', backgroundColor: set.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', border: set.isCompleted ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)', transition: 'all var(--transition-fast)' }}>
                      {/* Set Number / Type Picker Button */}
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setActiveSetTypePicker({
                            exerciseId: workoutExercise.id,
                            setId: set.id,
                            currentType: set.type || 'normal',
                            setIndex: setIdx
                          })}
                          title="Configurar tipo de série (Dropset, Braço Direito/Esquerdo, etc.)"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '24px',
                            transition: 'transform 0.15s, opacity 0.15s'
                          }}
                          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          {(() => {
                            const type = set.type || 'normal';
                            if (type === 'dropset') {
                              return <span style={{ color: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', padding: '2px 5px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 900 }}>D</span>;
                            }
                            if (type === 'right') {
                              return <span style={{ color: '#10B981', backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 4px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900 }}>Dir</span>;
                            }
                            if (type === 'left') {
                              return <span style={{ color: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', padding: '2px 4px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900 }}>Esq</span>;
                            }
                            if (type === 'warmup') {
                              return <span style={{ color: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 5px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 900 }}>W</span>;
                            }
                            if (type === 'failure') {
                              return <span style={{ color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 5px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 900 }}>F</span>;
                            }
                            return <span style={{ color: set.isCompleted ? 'var(--success)' : 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 850, fontSize: '0.9rem' }}>{setIdx + 1}</span>;
                          })()}
                        </button>
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
            )}
          </div>
        );
      })}

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
          onClick={() => { setShowAddExerciseModal(false); setSelectedApiExercise(null); setSelectedExerciseIds([]); setSearchQuery(''); setMuscleFilter('all'); }}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', height: '92vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', borderRadius: '24px 24px 0 0', overflow: 'hidden', position: 'relative' }}
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
                      {getExerciseCategory(selectedApiExercise)}
                    </div>
                  </div>
                  <button onClick={() => { setShowAddExerciseModal(false); setSelectedApiExercise(null); setSelectedExerciseIds([]); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
                  {/* GymVisual GIF Animation */}
                  {selectedApiExercise.media_id && (
                    <div style={{ margin: '16px 0', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', position: 'relative', border: '1px solid var(--border-color)' }}>
                      <img
                        src={`https://static.exercisedb.dev/media/${selectedApiExercise.media_id}.gif`}
                        alt={selectedApiExercise.name}
                        style={{ maxHeight: '90%', maxWidth: '90%', objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Muscles */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Músculo Principal</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'rgba(255,94,58,0.08)', color: 'var(--accent-color)', border: '1px solid rgba(255,94,58,0.2)' }}>
                        {getExerciseCategory(selectedApiExercise)}
                      </span>
                    </div>
                  </div>

                  {/* Secondary muscles */}
                  {selectedApiExercise.secondary_muscles.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Músculos Secundários</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedApiExercise.secondary_muscles.map(m => (
                          <span key={m} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
                            {mapCategory(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {selectedApiExercise.instructions && selectedApiExercise.instructions.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Execução</div>
                      <ol style={{ paddingLeft: '0', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', listStyle: 'none' }}>
                        {selectedApiExercise.instructions.map((step, i) => (
                          <li key={i} style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                            <span style={{ flexShrink: 0, width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(255,94,58,0.08)', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem', marginTop: '1px' }}>{i + 1}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{step.replace(/^Step:\s*\d+\s*/i, '')}</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        onClick={() => { setShowAddExerciseModal(false); setSelectedExerciseIds([]); setSearchQuery(''); setMuscleFilter('all'); setShowSearchInput(false); }} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                      >
                        <X size={24} />
                      </button>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 850, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Adicionar exercícios</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-primary)' }}>
                      <button 
                        onClick={() => setShowSearchInput(!showSearchInput)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        aria-label="Pesquisar"
                      >
                        <Search size={22} />
                      </button>
                      <SlidersHorizontal size={22} style={{ cursor: 'pointer' }} />
                      <Plus size={22} style={{ cursor: 'pointer' }} />
                    </div>
                  </div>

                  {/* Search Input (Toggled) */}
                  {showSearchInput && (
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Pesquisar por nome ou músculo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '38px', borderRadius: '14px' }}
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Muscle Filters Carousel */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    overflowX: 'auto',
                    padding: '4px 4px 16px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    alignItems: 'center'
                  }}>
                    {/* Bookmark Filter */}
                    <button
                      onClick={() => setMuscleFilter(muscleFilter === 'bookmarked' ? 'all' : 'bookmarked')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-card)',
                        border: muscleFilter === 'bookmarked' ? '2.5px solid var(--accent-color)' : '1.5px solid var(--border-color)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all var(--transition-fast)',
                        transform: muscleFilter === 'bookmarked' ? 'scale(1.1)' : 'scale(1.0)',
                        boxShadow: muscleFilter === 'bookmarked' ? '0 4px 12px rgba(255, 94, 58, 0.25)' : '0 2px 6px rgba(0,0,0,0.05)',
                        outline: 'none'
                      }}
                      aria-label="Exercícios Salvos"
                    >
                      <Bookmark 
                        size={22} 
                        fill={muscleFilter === 'bookmarked' ? 'var(--accent-color)' : 'none'} 
                        style={{
                          color: muscleFilter === 'bookmarked' ? 'var(--accent-color)' : 'var(--text-muted)',
                          transition: 'all var(--transition-fast)'
                        }}
                      />
                    </button>

                    {/* Muscle Silhouettes */}
                    {ALL_FILTER_MUSCLES.map((muscle) => {
                      const active = muscleFilter === muscle;
                      return (
                        <button
                          key={muscle}
                          onClick={() => setMuscleFilter(active ? 'all' : muscle)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '46px',
                            height: '46px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-card)',
                            border: active ? '2.5px solid var(--accent-color)' : '1.5px solid var(--border-color)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            padding: '4px',
                            transition: 'all var(--transition-fast)',
                            transform: active ? 'scale(1.1)' : 'scale(1.0)',
                            boxShadow: active ? '0 4px 12px var(--accent-glow)' : '0 2px 6px rgba(0,0,0,0.05)',
                            outline: 'none'
                          }}
                          aria-label={MUSCLE_LABELS[muscle]}
                        >
                          <div style={{ position: 'relative', width: '34px', height: '42px', overflow: 'hidden', borderRadius: '6px' }}>
                            {/* 1. Background Muscular System Body */}
                            <img 
                              src={muscle === 'back' ? '/muscular_system_back.svg' : '/muscular_system_front.svg'} 
                              alt="muscular system"
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain',
                                opacity: 0.35,
                                filter: 'grayscale(100%)',
                                transform: `scale(${MUSCLE_ZOOM_MAPPING[muscle].scale})`,
                                transformOrigin: MUSCLE_ZOOM_MAPPING[muscle].origin,
                                transition: 'all var(--transition-fast)'
                              }} 
                            />
                            {/* 2. Highlight Overlay */}
                            <img 
                              src={`/muscle_${muscle}.svg`} 
                              alt={MUSCLE_LABELS[muscle]} 
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'contain',
                                transform: `scale(${MUSCLE_ZOOM_MAPPING[muscle].scale})`,
                                transformOrigin: MUSCLE_ZOOM_MAPPING[muscle].origin,
                                opacity: active ? 1.0 : 0.5,
                                transition: 'all var(--transition-fast)'
                              }} 
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid List Container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 90px' }}>
                  {apiLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '60px 0', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-color)', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: '0.85rem' }}>A carregar base de dados...</span>
                    </div>
                  ) : apiError ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
                      Sem ligação à internet.<br />Os exercícios personalizados continuam disponíveis.
                    </div>
                  ) : (
                    <>
                      {/* 1. Realizados recentemente Section (Show only if search is empty and filter is 'all') */}
                      {searchQuery === '' && muscleFilter === 'all' && (
                        <div style={{ marginBottom: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <List size={14} style={{ color: 'var(--accent-color)' }} />
                              Realizados recentemente
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {getRecentExercises().map(ex => {
                              const isAdded = (activeWorkout?.exercises || []).some(a => a && a.id === ex.id);
                              const isSelected = selectedExerciseIds.includes(ex.id);
                              const checked = isAdded || isSelected;

                              return (
                                <div
                                  key={`recent-${ex.id}`}
                                  onClick={() => { if (!isAdded) toggleExerciseSelection(ex.id); }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRadius: '16px',
                                    border: checked ? '1.5px solid var(--text-primary)' : '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-card)',
                                    overflow: 'hidden',
                                    cursor: isAdded ? 'not-allowed' : 'pointer',
                                    position: 'relative',
                                    transition: 'all var(--transition-fast)',
                                    opacity: isAdded ? 0.75 : 1
                                  }}
                                >
                                  {/* Bookmark button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleBookmark(ex.id); }}
                                    style={{
                                      position: 'absolute',
                                      top: '12px',
                                      left: '12px',
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      zIndex: 5,
                                      color: bookmarkedIds.includes(ex.id) ? 'var(--text-primary)' : 'var(--text-muted)',
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    <Bookmark size={20} fill={bookmarkedIds.includes(ex.id) ? 'var(--text-primary)' : 'none'} strokeWidth={1.75} />
                                  </button>

                                  {/* Checked indicator */}
                                  {checked && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '12px',
                                      right: '12px',
                                      color: 'var(--text-primary)',
                                      fontWeight: 'bold',
                                      zIndex: 5,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Check size={20} strokeWidth={3.5} />
                                    </div>
                                  )}

                                  {/* Card image container */}
                                  <div style={{ height: '140px', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                    <StaticExerciseImage mediaId={ex.media_id} alt={ex.name} />
                                  </div>

                                  {/* Card Text footer */}
                                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                                    <div style={{ paddingRight: '14px' }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {translateExerciseName(ex.name)}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {getExerciseCategory(ex)}
                                      </div>
                                    </div>

                                    {/* Info circle button */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedApiExercise(ex); }}
                                      style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        right: '8px',
                                        background: 'none',
                                        border: 'none',
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}
                                    >
                                      <Info size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. All Exercises Section */}
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                        {searchQuery !== '' || muscleFilter !== 'all' ? 'Resultados da pesquisa' : 'Todos os Exercícios'} ({filteredLocalExercises.length + filteredApiExercises.length})
                      </div>

                      {/* 2-Column Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                        
                        {/* Custom local exercises first */}
                        {filteredLocalExercises.map((ex: Exercise) => {
                          const isAdded = (activeWorkout?.exercises || []).some(a => a && a.id === ex.id);
                          const isSelected = selectedExerciseIds.includes(ex.id);
                          const checked = isAdded || isSelected;

                          return (
                            <div
                              key={ex.id}
                              onClick={() => { if (!isAdded) toggleExerciseSelection(ex.id); }}
                              style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  borderRadius: '16px',
                                  border: checked ? '1.5px solid #1e293b' : '1px solid var(--border-color)',
                                  backgroundColor: '#ffffff',
                                  overflow: 'hidden',
                                  cursor: isAdded ? 'not-allowed' : 'pointer',
                                  position: 'relative',
                                  transition: 'all var(--transition-fast)',
                                  opacity: isAdded ? 0.75 : 1
                              }}
                            >
                              {/* Bookmark button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(ex.id); }}
                                style={{
                                  position: 'absolute',
                                  top: '12px',
                                  left: '12px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  zIndex: 5,
                                  color: bookmarkedIds.includes(ex.id) ? '#000000' : '#94a3b8',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Bookmark size={20} fill={bookmarkedIds.includes(ex.id) ? '#000000' : 'none'} strokeWidth={1.75} />
                              </button>

                              {/* Checked indicator */}
                              {checked && (
                                <div style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '12px',
                                  color: '#000000',
                                  fontWeight: 'bold',
                                  zIndex: 5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Check size={20} strokeWidth={3.5} />
                                </div>
                              )}

                              {/* Placeholder illustration */}
                              <div style={{ height: '140px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                <Dumbbell size={28} style={{ color: '#94a3b8' }} />
                              </div>

                              {/* Card footer */}
                              <div style={{ padding: '12px', backgroundColor: '#ffffff', borderTop: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#000000', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {ex.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                    {ex.category}
                                  </div>
                                </div>
                                <span style={{ fontSize: '0.58rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '4px', letterSpacing: '0.05em' }}>Personalizado</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* GymVisual illustrated database exercises */}
                        {filteredApiExercises.slice(0, visibleLimit).map((ex: ApiExercise) => {
                          const isAdded = (activeWorkout?.exercises || []).some(a => a && a.id === ex.id);
                          const isSelected = selectedExerciseIds.includes(ex.id);
                          const checked = isAdded || isSelected;

                          return (
                            <div
                              key={ex.id}
                              onClick={() => { if (!isAdded) toggleExerciseSelection(ex.id); }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                borderRadius: '16px',
                                border: checked ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-card)',
                                overflow: 'hidden',
                                cursor: isAdded ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                transition: 'all var(--transition-fast)',
                                opacity: isAdded ? 0.75 : 1
                              }}
                            >
                              {/* Bookmark button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(ex.id); }}
                                style={{
                                  position: 'absolute',
                                  top: '12px',
                                  left: '12px',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  zIndex: 5,
                                  color: bookmarkedIds.includes(ex.id) ? 'var(--accent-color)' : 'var(--text-muted)',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <Bookmark size={20} fill={bookmarkedIds.includes(ex.id) ? 'var(--accent-color)' : 'none'} strokeWidth={1.75} />
                              </button>

                              {/* Checked indicator */}
                              {checked && (
                                <div style={{
                                  position: 'absolute',
                                  top: '12px',
                                  right: '12px',
                                  color: 'var(--accent-color)',
                                  fontWeight: 'bold',
                                  zIndex: 5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Check size={20} strokeWidth={3.5} />
                                </div>
                              )}

                              {/* Card image container */}
                              <div style={{ height: '140px', backgroundColor: '#F8F9FD', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                <StaticExerciseImage mediaId={ex.media_id} alt={ex.name} />
                              </div>

                              {/* Card footer */}
                              <div style={{ padding: '12px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
                                <div style={{ paddingRight: '14px' }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.25', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {translateExerciseName(ex.name)}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {getExerciseCategory(ex)}
                                  </div>
                                </div>

                                {/* Info circle button */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedApiExercise(ex); }}
                                  style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    right: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <Info size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredLocalExercises.length === 0 && filteredApiExercises.length === 0 && (
                          <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-secondary)', padding: '40px 0', fontSize: '0.85rem' }}>
                            Nenhum exercício encontrado.
                          </div>
                        )}
                      </div>

                      {/* Mostrar mais botão se houver mais exercícios */}
                      {filteredApiExercises.length > visibleLimit && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                          <button
                            type="button"
                            onClick={() => setVisibleLimit(prev => prev + 30)}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid var(--border-color)',
                              borderRadius: '16px',
                              padding: '12px 24px',
                              color: 'var(--accent-color)',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                          >
                            Mostrar mais ({filteredApiExercises.length - visibleLimit} exercícios)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Batch add floating button at bottom */}
                {selectedExerciseIds.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '20px',
                    right: '20px',
                    zIndex: 1010,
                    display: 'flex',
                    justifyContent: 'center',
                    pointerEvents: 'auto'
                  }}>
                    <button
                      onClick={handleConfirmAddExercises}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        borderRadius: '99px',
                        backgroundColor: '#007aff',
                        boxShadow: '0 8px 24px rgba(0, 122, 255, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      Adicionar {selectedExerciseIds.length} {selectedExerciseIds.length === 1 ? 'exercício' : 'exercícios'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Set Type Selection Modal ────────────────────────────────────── */}
      {activeSetTypePicker && (
        <div
          onClick={() => setActiveSetTypePicker(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Tipo de Série #{activeSetTypePicker.setIndex + 1}
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Escolhe a modalidade para esta série
                </p>
              </div>
              <button
                onClick={() => setActiveSetTypePicker(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Options list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {SET_TYPE_OPTIONS.map((opt) => {
                const isSelected = (activeSetTypePicker.currentType || 'normal') === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      handleUpdateSet(activeSetTypePicker.exerciseId, activeSetTypePicker.setId, { type: opt.type });
                      setActiveSetTypePicker(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? 'rgba(91,94,244,0.06)' : 'var(--bg-primary)',
                      border: isSelected ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: opt.bg,
                          color: opt.color,
                          border: `1px solid ${opt.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: opt.badge.length > 2 ? '0.68rem' : '0.85rem',
                          flexShrink: 0
                        }}
                      >
                        {opt.badge}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          {opt.desc}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={13} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Delete set option button */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  handleRemoveSet(activeSetTypePicker.exerciseId, activeSetTypePicker.setId);
                  setActiveSetTypePicker(null);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'none',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: 'var(--danger)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> Eliminar esta série
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
