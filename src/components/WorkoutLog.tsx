import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Workout, Exercise, WorkoutExercise, Set, AppSettings, WorkoutTemplate } from '../types';
import { Plus, Trash2, Check, X, Dumbbell, ChevronLeft, Search, Info, Bookmark, SlidersHorizontal, List } from 'lucide-react';
import { translateExerciseName } from '../utils/translateExercise';

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

// Agrupa músculos da API por categoria de filtro
const MUSCLE_GROUPS: Record<string, string[]> = {
  chest: ['chest', 'pectorals'],
  arms: ['biceps', 'triceps', 'forearms', 'wrist flexors', 'wrist extensors'],
  shoulders: ['shoulders', 'deltoids', 'rotator cuff'],
  back: ['back', 'lats', 'latissimus dorsi', 'lower back', 'upper back', 'traps', 'trapezius', 'rhomboids'],
  abdominals: ['abdominals', 'core', 'obliques', 'hip flexors'],
  legs: ['quadriceps', 'quads', 'hamstrings', 'glutes', 'gluteus maximus', 'calves', 'soleus', 'ankles', 'ankle stabilizers'],
};

const muscleMatchesFilter = (muscleGroup: string, filter: string): boolean => {
  if (filter === 'all') return true;
  if (filter === 'bookmarked') return true; // Handled separately
  const group = MUSCLE_GROUPS[filter];
  if (!group) return false;
  return group.includes((muscleGroup || '').toLowerCase());
};
const MUSCLE_ZOOM_MAPPING: Record<string, { scale: number; origin: string }> = {
  chest: { scale: 1.6, origin: 'center 28%' },
  arms: { scale: 1.5, origin: 'center 34%' },
  shoulders: { scale: 1.7, origin: 'center 22%' },
  abdominals: { scale: 1.6, origin: 'center 38%' },
  back: { scale: 1.6, origin: 'center 28%' },
  legs: { scale: 1.4, origin: 'center 68%' },
};// Component to render static exercise thumbnail with ultra-fast lazy loading
const StaticExerciseImage: React.FC<{ mediaId: string; alt: string; style?: React.CSSProperties }> = ({ mediaId, alt, style }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!mediaId || error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: '#F8F9FD' }}>
        <Dumbbell size={26} opacity={0.35} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: '#F8F9FD', overflow: 'hidden' }}>
      {!loaded && (
        <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Dumbbell size={24} color="var(--accent-color)" opacity={0.25} />
        </div>
      )}
      <img
        src={`https://static.exercisedb.dev/media/${mediaId}.gif`}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          ...style,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
};

const OLD_EXERCISE_ID_MAPPING: Record<string, string> = {
  '1': 'qXTaZnJ',  // Agachamento (Squat) -> barbell full squat
  '2': 'EIeI8Vf',  // Supino Plano (Bench Press) -> barbell bench press
  '3': 'ila4NZS',  // Peso Morto (Deadlift) -> barbell deadlift
  '4': 'wdRZISl',  // Press Militar (Overhead Press) -> barbell standing military press
  '5': 'lBDjFxJ',  // Elevações (Pull-ups) -> pull-up
  '6': 'eZyBC3j',  // Remada com Barra (Barbell Row) -> barbell bent over row
  '7': '25GPyDY',  // Bicep Curl com Halteres -> barbell curl (or dumbbell bicep curl)
  '8': '3ZflifB',  // Tricep Pushdown -> cable pushdown
  '9': '10Z2DXU',  // Prensa de Pernas (Leg Press) -> sled 45° leg press
  '10': 'TFqbd8t', // Abdominais (Crunches) -> crunch floor
  '11': 'DsgkuIt', // Elevações Laterais (Lateral Raises) -> dumbbell lateral raise
  '12': '3TZduzM', // Supino Inclinado (Incline Press) -> barbell incline bench press
};

const OLD_EXERCISE_NAME_MAPPING: Record<string, string> = {
  'agachamento (squat)': 'qXTaZnJ',
  'agachamento com barra': 'qXTaZnJ',
  'agachamento': 'qXTaZnJ',
  'supino plano (bench press)': 'EIeI8Vf',
  'supino reto com barra': 'EIeI8Vf',
  'supino plano': 'EIeI8Vf',
  'supino': 'EIeI8Vf',
  'peso morto (deadlift)': 'ila4NZS',
  'levantamento terra (deadlift)': 'ila4NZS',
  'peso morto': 'ila4NZS',
  'press militar (overhead press)': 'wdRZISl',
  'desenvolvimento militar': 'wdRZISl',
  'press militar': 'wdRZISl',
  'elevações (pull-ups)': 'lBDjFxJ',
  'elevações': 'lBDjFxJ',
  'pull-up': 'lBDjFxJ',
  'pull-ups': 'lBDjFxJ',
  'remada com barra (barbell row)': 'eZyBC3j',
  'remada curvada com barra': 'eZyBC3j',
  'remada com barra': 'eZyBC3j',
  'bicep curl com halteres': '25GPyDY',
  'bicep curl': '25GPyDY',
  'curl com barra': '25GPyDY',
  'tricep pushdown': '3ZflifB',
  'tríceps pushdown': '3ZflifB',
  'prensa de pernas (leg press)': '10Z2DXU',
  'prensa 45° (leg press)': '10Z2DXU',
  'prensa de pernas': '10Z2DXU',
  'leg press': '10Z2DXU',
  'abdominais (crunches)': 'TFqbd8t',
  'abdominais': 'TFqbd8t',
  'crunches': 'TFqbd8t',
  'elevações laterais (lateral raises)': 'DsgkuIt',
  'elevações laterais': 'DsgkuIt',
  'elevação lateral': 'DsgkuIt',
  'supino inclinado (incline press)': '3TZduzM',
  'supino inclinado': '3TZduzM',
};

const resolveExerciseMediaId = (
  workoutExercise: { id?: string; name?: string },
  apiExercisesList: ApiExercise[]
): string | null => {
  const id = workoutExercise.id || '';
  const rawName = (workoutExercise.name || '').trim().toLowerCase();

  // 1. Direct match by API exercise ID (e.g. '0025')
  const byApiId = apiExercisesList.find(e => e.id === id);
  if (byApiId?.media_id) return byApiId.media_id;

  // 2. Direct match by API media_id (e.g. 'EIeI8Vf')
  const byMediaId = apiExercisesList.find(e => e.media_id === id);
  if (byMediaId?.media_id) return byMediaId.media_id;

  // 3. If ID itself looks like a GymVisual media_id (alphanumeric 6-9 chars, not purely digits)
  if (id && id.length >= 6 && id.length <= 10 && !/^\d+$/.test(id)) {
    return id;
  }

  // 4. Match in OLD_EXERCISE_ID_MAPPING (default 1-12)
  if (OLD_EXERCISE_ID_MAPPING[id]) {
    return OLD_EXERCISE_ID_MAPPING[id];
  }

  // 5. Match by exact English name in apiExercises
  const byName = apiExercisesList.find(e => e.name.toLowerCase() === rawName);
  if (byName?.media_id) return byName.media_id;

  // 6. Match in OLD_EXERCISE_NAME_MAPPING
  if (OLD_EXERCISE_NAME_MAPPING[rawName]) {
    return OLD_EXERCISE_NAME_MAPPING[rawName];
  }

  // 7. Comprehensive fuzzy Portuguese / English keyword matching
  if (rawName.includes('supino reto') || (rawName.includes('supino') && !rawName.includes('inclinado') && !rawName.includes('declinado')) || rawName.includes('bench press')) {
    return 'EIeI8Vf';
  }
  if (rawName.includes('supino inclinado') || rawName.includes('incline bench press') || rawName.includes('incline press')) {
    return '3TZduzM';
  }
  if (rawName.includes('supino declinado') || rawName.includes('decline bench press')) {
    return '1l2K2gN';
  }
  if (rawName.includes('militar') || rawName.includes('overhead press') || rawName.includes('desenvolvimento')) {
    return 'wdRZISl';
  }
  if (rawName.includes('agachamento') || rawName.includes('squat')) {
    return 'qXTaZnJ';
  }
  if (rawName.includes('peso morto') || rawName.includes('deadlift') || rawName.includes('terra')) {
    return 'ila4NZS';
  }
  if (rawName.includes('elevações') || rawName.includes('elevaçoes') || rawName.includes('pull-up') || rawName.includes('pullup') || rawName.includes('dominadas')) {
    return 'lBDjFxJ';
  }
  if (rawName.includes('remada') || rawName.includes('row')) {
    return 'eZyBC3j';
  }
  if (rawName.includes('bicep') || rawName.includes('bíceps') || rawName.includes('curl')) {
    return '25GPyDY';
  }
  if (rawName.includes('tricep') || rawName.includes('tríceps') || rawName.includes('pushdown')) {
    return '3ZflifB';
  }
  if (rawName.includes('prensa') || rawName.includes('leg press')) {
    return '10Z2DXU';
  }
  if (rawName.includes('lateral') || rawName.includes('elevação lateral') || rawName.includes('elevações laterais')) {
    return 'DsgkuIt';
  }
  if (rawName.includes('abdominal') || rawName.includes('abdominais') || rawName.includes('crunch')) {
    return 'TFqbd8t';
  }

  return null;
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface WorkoutLogProps {
  activeWorkout: Workout | null;
  exercises: Exercise[];
  settings: AppSettings;
  templates: WorkoutTemplate[];
  workouts: Workout[];
  onUpdateWorkout: (workout: Workout) => void;
  onSaveWorkout: () => void;
  onCancelWorkout: () => void;
  onStartWorkout: () => void;
  onAddTemplate: (name: string, exercises: WorkoutExercise[]) => void;
  onDeleteTemplate: (id: string) => void;
  onStartWorkoutFromTemplate: (template: WorkoutTemplate) => void;
}

export const WorkoutLog: React.FC<WorkoutLogProps> = ({
  activeWorkout,
  exercises,
  settings,
  templates,
  workouts,
  onUpdateWorkout,
  onCancelWorkout,
  onStartWorkout,
  onAddTemplate,
  onDeleteTemplate,
  onStartWorkoutFromTemplate,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaveWorkout: _onSaveWorkout,
}) => {
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [visibleLimit, setVisibleLimit] = useState(30);
  const [selectedApiExercise, setSelectedApiExercise] = useState<ApiExercise | null>(null);
  const [apiExercises, setApiExercises] = useState<ApiExercise[]>(() => cachedApiExercises || []);
  const [apiLoading, setApiLoading] = useState(() => !cachedApiExercises);
  const [apiError, setApiError] = useState(false);

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
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

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

  // Rest timer
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  const [restDuration, setRestDuration] = useState<number>(settings.defaultRestDuration);
  const timerIntervalRef = useRef<number | null>(null);

  // Elapsed workout time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active workout duration tick
  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = activeWorkout.date ? new Date(activeWorkout.date).getTime() : Date.now();
    const interval = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(seconds >= 0 ? seconds : 0);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeWorkout]);

  // Save elapsed duration on each tick
  useEffect(() => {
    if (activeWorkout && elapsedSeconds > 0) {
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
    timerIntervalRef.current = window.setInterval(() => {
      setRestTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => { if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current); };
  }, [restTimeLeft]);

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

    // System Push Notification (triggers exactly once when the rest time ends)
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = 'Tempo de Descanso Concluído! ⏱️';
      const body = 'Está na hora de começares a próxima série!';
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'rest-timer-end',
            renotify: true,
            vibrate: [200, 100, 200]
          } as any);
        }).catch(() => {
          new Notification(title, {
            body,
            icon: '/logo.png',
            tag: 'rest-timer-end',
            renotify: true
          } as any);
        });
      } else {
        new Notification(title, {
          body,
          icon: '/logo.png',
          tag: 'rest-timer-end',
          renotify: true
        } as any);
      }
    }
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      window.customAlert('Nome Inválido', 'Tens de introduzir um nome para o treino.');
      return;
    }
    if (selectedExerciseIds.length === 0) {
      window.customAlert('Nenhum Exercício', 'Seleciona pelo menos um exercício para a rotina.');
      return;
    }

    const templateExercises: WorkoutExercise[] = selectedExerciseIds.map(id => {
      const ex = exercises.find(e => e.id === id);
      return {
        id,
        name: ex ? ex.name : 'Exercício',
        category: ex ? ex.category : 'Outro',
        sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }]
      };
    });

    onAddTemplate(newTemplateName, templateExercises);
    setNewTemplateName('');
    setSelectedExerciseIds([]);
    setShowCreateTemplateModal(false);
  };

  const toggleSelectExercise = (id: string) => {
    setSelectedExerciseIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredTemplateExercises = exercises.filter(ex => 
    !templateSearchQuery || ex.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) || ex.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
  );

  const formatElapsed = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Combine local custom exercises + filter API exercises
  const localExercises = useMemo(() => exercises.filter(ex => ex.isCustom), [exercises]);

  const filteredApiExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return apiExercises.filter(ex => {
      const matchesMuscle = muscleFilter === 'bookmarked' 
        ? bookmarkedIds.includes(ex.id)
        : muscleMatchesFilter(ex.muscle_group, muscleFilter);
      if (!matchesMuscle) return false;
      if (!q) return true;
      return ex.name.toLowerCase().includes(q) ||
        ex.muscle_group.toLowerCase().includes(q) ||
        (MUSCLE_LABELS[ex.muscle_group.toLowerCase()] || '').toLowerCase().includes(q);
    });
  }, [apiExercises, muscleFilter, bookmarkedIds, searchQuery]);

  const filteredLocalExercises = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return localExercises;
    return localExercises.filter((ex: Exercise) =>
      ex.name.toLowerCase().includes(q) || ex.category.toLowerCase().includes(q)
    );
  }, [localExercises, searchQuery]);

  // Add multiple selected exercises to active workout
  const handleConfirmAddExercises = () => {
    if (selectedExerciseIds.length === 0) return;

    const exercisesToAdd = apiExercises.filter(ex => selectedExerciseIds.includes(ex.id));
    const newWorkoutExercises: WorkoutExercise[] = exercisesToAdd.map(exercise => {
      const category = mapCategory(exercise.muscle_group);
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
      category: exercise.category,
      sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
    }));

    if (!activeWorkout) return;
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

    let category = '';
    if ('muscle_group' in exercise) {
      category = mapCategory((exercise as ApiExercise).muscle_group);
    } else {
      category = (exercise as Exercise).category;
    }

    const newWorkoutExercise: WorkoutExercise = {
      id,
      name: exercise.name,
      category,
      sets: [{ id: Math.random().toString(36).substring(2, 9), weight: 0, reps: 0, isCompleted: false }],
    };
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
    onUpdateWorkout({
      ...activeWorkout,
      exercises: (activeWorkout.exercises || []).map((ex) => {
        if (ex.id !== exerciseId) return ex;
        return {
          ...ex,
          sets: (ex.sets || []).map((s) => {
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

  if (!activeWorkout) {
    const DEFAULT_STARTER_ROUTINES: WorkoutTemplate[] = [
      {
        id: 'starter-push',
        name: 'Treino A — Empurrar (Push)',
        exercises: [
          { id: 'EIeI8Vf', name: 'barbell bench press', category: 'Peito', sets: [{ id: 's1', weight: 60, reps: 10, isCompleted: false }, { id: 's2', weight: 60, reps: 10, isCompleted: false }, { id: 's3', weight: 60, reps: 8, isCompleted: false }] },
          { id: '3TZduzM', name: 'barbell incline bench press', category: 'Peito', sets: [{ id: 's4', weight: 50, reps: 10, isCompleted: false }, { id: 's5', weight: 50, reps: 10, isCompleted: false }] },
          { id: 'wdRZISl', name: 'barbell standing military press', category: 'Ombros', sets: [{ id: 's6', weight: 40, reps: 10, isCompleted: false }, { id: 's7', weight: 40, reps: 8, isCompleted: false }] },
          { id: '3ZflifB', name: 'cable pushdown', category: 'Braços', sets: [{ id: 's8', weight: 25, reps: 12, isCompleted: false }, { id: 's9', weight: 25, reps: 12, isCompleted: false }] }
        ]
      },
      {
        id: 'starter-pull',
        name: 'Treino B — Puxar (Pull)',
        exercises: [
          { id: 'lBDjFxJ', name: 'pull-up', category: 'Costas', sets: [{ id: 's10', weight: 0, reps: 8, isCompleted: false }, { id: 's11', weight: 0, reps: 8, isCompleted: false }] },
          { id: 'eZyBC3j', name: 'barbell bent over row', category: 'Costas', sets: [{ id: 's12', weight: 50, reps: 10, isCompleted: false }, { id: 's13', weight: 50, reps: 10, isCompleted: false }] },
          { id: 'ila4NZS', name: 'barbell deadlift', category: 'Costas', sets: [{ id: 's14', weight: 80, reps: 6, isCompleted: false }, { id: 's15', weight: 80, reps: 6, isCompleted: false }] },
          { id: '25GPyDY', name: 'barbell curl', category: 'Braços', sets: [{ id: 's16', weight: 25, reps: 12, isCompleted: false }, { id: 's17', weight: 25, reps: 10, isCompleted: false }] }
        ]
      },
      {
        id: 'starter-legs',
        name: 'Treino C — Pernas (Legs)',
        exercises: [
          { id: 'qXTaZnJ', name: 'barbell full squat', category: 'Pernas', sets: [{ id: 's18', weight: 70, reps: 10, isCompleted: false }, { id: 's19', weight: 70, reps: 10, isCompleted: false }, { id: 's20', weight: 70, reps: 8, isCompleted: false }] },
          { id: '10Z2DXU', name: 'sled 45° leg press', category: 'Pernas', sets: [{ id: 's21', weight: 120, reps: 12, isCompleted: false }, { id: 's22', weight: 120, reps: 10, isCompleted: false }] },
          { id: 'DsgkuIt', name: 'dumbbell lateral raise', category: 'Ombros', sets: [{ id: 's23', weight: 10, reps: 15, isCompleted: false }, { id: 's24', weight: 10, reps: 15, isCompleted: false }] }
        ]
      }
    ];

    const displayedTemplates = templates.length > 0 ? templates : DEFAULT_STARTER_ROUTINES;

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
              {templates.length > 0 ? 'As Tuas Rotinas' : 'Rotinas Recomendadas'}
            </h3>
            {templates.length === 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-color)', fontWeight: 700 }}>3 Sugestões</span>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayedTemplates.map((template) => (
              <div 
                key={template.id} 
                className="glass-card" 
                style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: 0, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
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
                  {templates.length > 0 && (
                    <button 
                      onClick={() => {
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
                  )}
                </div>

                <button 
                  className="btn btn-primary"
                  onClick={() => onStartWorkoutFromTemplate(template)}
                  style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem', width: '100%' }}
                >
                  <Dumbbell size={18} /> Iniciar Treino
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Create Template */}
        {showCreateTemplateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateTemplateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '20px 20px 16px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>Nova Rotina de Treino</h3>
                <button 
                  onClick={() => setShowCreateTemplateModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleCreateTemplateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
                
                {/* Template Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome da Rotina</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="ex: Treino A - Empurrar"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    style={{ fontWeight: 600 }}
                  />
                </div>

                {/* Exercises Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Selecionar Exercícios ({selectedExerciseIds.length})
                  </label>
                  
                  {/* Search inside modal */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Procurar exercício..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>

                  {/* Scrollable list */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '8px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    {filteredTemplateExercises.map((ex) => {
                      const isSelected = selectedExerciseIds.includes(ex.id);
                      return (
                        <div 
                          key={ex.id}
                          onClick={() => toggleSelectExercise(ex.id)}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'rgba(255, 94, 58, 0.2)' : 'transparent'}`,
                            backgroundColor: isSelected ? 'rgba(255, 94, 58, 0.04)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                              {translateExerciseName(ex.name)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{ex.category}</div>
                          </div>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                            backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            transition: 'all var(--transition-fast)'
                          }}>
                            {isSelected && <Check size={14} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons */}
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', flexShrink: 0 }}>
                  Criar Rotina de Treino
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Workout Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <input
            type="text"
            className="form-input"
            value={activeWorkout?.name || ''}
            onChange={(e) => activeWorkout && onUpdateWorkout({ ...activeWorkout, name: e.target.value })}
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
      {(activeWorkout?.exercises || []).map((workoutExercise) => {
        const mediaId = resolveExerciseMediaId(workoutExercise, apiExercises);

        return (
          <div key={workoutExercise.id} className="glass-card" style={{ padding: '20px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {mediaId ? (
                    <StaticExerciseImage mediaId={mediaId} alt={workoutExercise.name} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
                  ) : (
                    <Dumbbell size={22} color="var(--accent-color)" opacity={0.4} />
                  )}
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {translateExerciseName(workoutExercise.name)}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                    {workoutExercise.category}
                  </span>
                </div>
              </div>
              <button onClick={() => handleRemoveExercise(workoutExercise.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', opacity: 0.6, marginTop: '4px' }}>
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
                      {mapCategory(selectedApiExercise.muscle_group)}
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
                        {mapCategory(selectedApiExercise.muscle_group)}
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
                            {m}
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
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {mapCategory(ex.muscle_group)}
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
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {mapCategory(ex.muscle_group)}
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

      {/* Spin animation for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
