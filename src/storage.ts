import type { AppData, Exercise, Workout, PersonalRecord, AppSettings, UserProfile } from './types';

const STORAGE_KEY = 'strongpr_app_data';

// Default Exercises List
export const DEFAULT_EXERCISES: Exercise[] = [
  { id: '1', name: 'Agachamento (Squat)', category: 'Pernas' },
  { id: '2', name: 'Supino Plano (Bench Press)', category: 'Peito' },
  { id: '3', name: 'Peso Morto (Deadlift)', category: 'Costas' },
  { id: '4', name: 'Press Militar (Overhead Press)', category: 'Ombros' },
  { id: '5', name: 'Elevações (Pull-ups)', category: 'Costas' },
  { id: '6', name: 'Remada com Barra (Barbell Row)', category: 'Costas' },
  { id: '7', name: 'Bicep Curl com Halteres', category: 'Braços' },
  { id: '8', name: 'Tricep Pushdown', category: 'Braços' },
  { id: '9', name: 'Prensa de Pernas (Leg Press)', category: 'Pernas' },
  { id: '10', name: 'Abdominais (Crunches)', category: 'Core' },
  { id: '11', name: 'Elevações Laterais (Lateral Raises)', category: 'Ombros' },
  { id: '12', name: 'Supino Inclinado (Incline Press)', category: 'Peito' },
];

const DEFAULT_SETTINGS: AppSettings = {
  defaultRestDuration: 90, // 90 seconds
  enableVibration: true,
  enableSound: true,
};

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  weight: 70,
  height: 175,
  age: 25,
  avatarUrl: '',
  avatarType: 'silhouette',
  onboarded: false,
  weeklyGoal: 4,
};

// Initial App State
export const INITIAL_DATA: AppData = {
  workouts: [],
  exercises: DEFAULT_EXERCISES,
  prs: [],
  settings: DEFAULT_SETTINGS,
  profile: DEFAULT_PROFILE,
  templates: [],
};

// Calculate Estimated 1-Rep Max (1RM) using Epley's formula
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + 0.0333 * reps) * 10) / 10;
}

// Load data from LocalStorage
export function loadAppData(): AppData {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      // Save initial data
      saveAppData(INITIAL_DATA);
      return INITIAL_DATA;
    }
    
    const parsed = JSON.parse(rawData);
    
    // Ensure structure is correct
    return {
      workouts: parsed.workouts || [],
      exercises: parsed.exercises && parsed.exercises.length > 0 ? parsed.exercises : DEFAULT_EXERCISES,
      prs: parsed.prs || [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
      templates: parsed.templates || [],
    };
  } catch (error) {
    console.error('Failed to load data from localStorage', error);
    return INITIAL_DATA;
  }
}

// Save data to LocalStorage
export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage', error);
  }
}

// Check and update PR records based on a completed workout
export function checkAndUpdatePRs(workout: Workout, existingPRs: PersonalRecord[]): { updatedPRs: PersonalRecord[], newPRsCount: number } {
  const updatedPRs = [...existingPRs];
  let newPRsCount = 0;
  const nowStr = workout.date || new Date().toISOString();

  (workout.exercises || []).forEach((workoutExercise) => {
    // Find the best completed set for this exercise in this workout
    const completedSets = (workoutExercise.sets || []).filter((s) => s && s.isCompleted);
    if (completedSets.length === 0) return;

    let bestSet = completedSets[0];
    completedSets.forEach((s) => {
      const sw = Number(s.weight) || 0;
      const sr = Number(s.reps) || 0;
      const bw = Number(bestSet.weight) || 0;
      const br = Number(bestSet.reps) || 0;
      if (sw > bw || (sw === bw && sr > br)) {
        bestSet = s;
      }
    });

    const currWeight = Number(bestSet.weight) || 0;
    const currReps = Number(bestSet.reps) || 0;
    if (currWeight <= 0 && currReps <= 0) return;

    const est1RM = calculate1RM(currWeight, currReps);
    
    // Find existing PR for this exercise (by ID or case-insensitive exercise name)
    const existingIndex = updatedPRs.findIndex(
      (p) => p.exerciseId === workoutExercise.id || p.exerciseName.toLowerCase().trim() === workoutExercise.name.toLowerCase().trim()
    );
    const previousPR = existingIndex !== -1 ? updatedPRs[existingIndex] : null;

    const isBetter = !previousPR || 
      currWeight > previousPR.weight || 
      (currWeight === previousPR.weight && currReps > previousPR.reps) ||
      est1RM > previousPR.estimated1RM;

    if (isBetter) {
      // We have a new or improved Personal Record!
      const newPR: PersonalRecord = {
        id: previousPR ? previousPR.id : (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9)),
        exerciseId: workoutExercise.id,
        exerciseName: workoutExercise.name,
        weight: currWeight,
        reps: currReps,
        estimated1RM: est1RM,
        date: nowStr,
        workoutId: workout.id,
      };
      
      if (existingIndex !== -1) {
        // Replace previous old PR with the new PR
        updatedPRs[existingIndex] = newPR;
      } else {
        updatedPRs.push(newPR);
      }
      newPRsCount++;
    }
  });

  return { updatedPRs, newPRsCount };
}

// Recalculates all PRs from a list of workouts and optional manual PRs
export function recalculateAllPRs(workouts: Workout[], manualPRs: PersonalRecord[] = []): PersonalRecord[] {
  let currentPRs: PersonalRecord[] = (manualPRs || []).filter(p => !p.workoutId);

  // Sort workouts chronologically from oldest to newest
  const validWorkouts = (workouts || [])
    .filter(w => w && w.date && w.exercises && w.exercises.length > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  validWorkouts.forEach((w) => {
    const { updatedPRs } = checkAndUpdatePRs(w, currentPRs);
    currentPRs = updatedPRs;
  });

  return currentPRs;
}

// Export backup to JSON file
export function exportBackup(data: AppData): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `strongpr_backup_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import backup from JSON file
export function importBackup(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Basic validation
        if (parsed && typeof parsed === 'object') {
          const appData: AppData = {
            workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
            exercises: Array.isArray(parsed.exercises) ? parsed.exercises : DEFAULT_EXERCISES,
            prs: Array.isArray(parsed.prs) ? parsed.prs : [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
            profile: parsed.profile || DEFAULT_PROFILE,
            templates: Array.isArray(parsed.templates) ? parsed.templates : [],
          };
          saveAppData(appData);
          resolve(appData);
        } else {
          reject(new Error('Formato de backup inválido.'));
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro.'));
    reader.readAsText(file);
  });
}
