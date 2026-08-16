export interface Set {
  id: string;
  weight: number;
  reps: number;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  id: string; // references basic exercise id
  name: string;
  category: string;
  sets: Set[];
}

export interface Workout {
  id: string;
  name: string;
  date: string; // ISO string
  exercises: WorkoutExercise[];
  notes?: string;
  duration?: number; // in seconds
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
  workoutId?: string;
}

export interface UserProfile {
  name: string;
  weight: number;
  height: number; // in cm
  age: number;
  avatarUrl: string; // base64 string or silhouette/emoji
  avatarType: 'emoji' | 'image' | 'silhouette';
  onboarded: boolean;
}

export type ActiveTab = 'history' | 'workout' | 'profile';

export interface AppSettings {
  defaultRestDuration: number; // in seconds
  enableVibration: boolean;
  enableSound: boolean;
}

export interface AppData {
  workouts: Workout[];
  exercises: Exercise[];
  prs: PersonalRecord[];
  settings: AppSettings;
  profile: UserProfile;
}

