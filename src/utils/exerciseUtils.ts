/**
 * Utility functions for exercise classification and volume calculations.
 */

export interface ApiExerciseItem {
  id: string;
  name: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  target?: string;
  media_id?: string;
  instructions?: string[];
}

export const OLD_EXERCISE_ID_MAPPING: Record<string, string> = {
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

export const OLD_EXERCISE_NAME_MAPPING: Record<string, string> = {
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

export const resolveExerciseMediaId = (
  workoutExercise: { id?: string; name?: string; media_id?: string },
  apiExercisesList: ApiExerciseItem[] = []
): string | null => {
  if (workoutExercise.media_id) return workoutExercise.media_id;
  const id = workoutExercise.id || '';
  const rawName = (workoutExercise.name || '').trim().toLowerCase();

  // 1. Direct match by API exercise ID (e.g. '0025')
  if (apiExercisesList.length > 0) {
    const byApiId = apiExercisesList.find(e => e.id === id);
    if (byApiId?.media_id) return byApiId.media_id;

    // 2. Direct match by API media_id (e.g. 'EIeI8Vf')
    const byMediaId = apiExercisesList.find(e => e.media_id === id);
    if (byMediaId?.media_id) return byMediaId.media_id;
  }

  // 3. If ID itself looks like a GymVisual media_id (alphanumeric 6-9 chars, not purely digits)
  if (id && id.length >= 6 && id.length <= 10 && !/^\d+$/.test(id)) {
    return id;
  }

  // 4. Match in OLD_EXERCISE_ID_MAPPING (default 1-12)
  if (OLD_EXERCISE_ID_MAPPING[id]) {
    return OLD_EXERCISE_ID_MAPPING[id];
  }

  // 5. Match by exact English name in apiExercises
  if (apiExercisesList.length > 0) {
    const byName = apiExercisesList.find(e => e.name.toLowerCase() === rawName);
    if (byName?.media_id) return byName.media_id;
  }

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

/**
 * Checks if an exercise uses two dumbbells (bilateral dumbbell exercise),
 * meaning the weight logged is for ONE dumbbell and should be multiplied by 2 for volume.
 */
export function isDoubleDumbbellExercise(exercise?: { name?: string } | string | null): boolean {
  if (!exercise) return false;
  const name = (typeof exercise === 'string' ? exercise : exercise.name || '').toLowerCase().trim();
  if (!name) return false;

  // Unilateral / single arm exceptions
  if (
    name.includes('single arm') ||
    name.includes('one arm') ||
    name.includes('1 arm') ||
    name.includes('unilateral') ||
    name.includes('single-arm') ||
    name.includes('one-arm') ||
    name.includes('unilaterais') ||
    name.includes('uma mão') ||
    name.includes('1 mão')
  ) {
    return false;
  }

  // Dumbbell keywords (English & Portuguese)
  const isDumbbell =
    name.includes('dumbbell') ||
    name.includes('dumbell') ||
    name.includes('haltere') ||
    name.includes('halteres') ||
    name.includes(' db ') ||
    name.startsWith('db ') ||
    name.endsWith(' db') ||
    name.includes('arnold press') ||
    name.includes('hammer curl') ||
    name.includes('curl martelo') ||
    name.includes('martelo com haltere') ||
    name.includes('martelo');

  return isDumbbell;
}

/**
 * Returns the weight multiplier for volume calculation (2 for bilateral dumbbells, 1 otherwise).
 */
export function getExerciseWeightMultiplier(exercise?: { name?: string } | string | null): number {
  return isDoubleDumbbellExercise(exercise) ? 2 : 1;
}
