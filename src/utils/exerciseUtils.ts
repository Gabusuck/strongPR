/**
 * Utility functions for exercise classification and volume calculations.
 */

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
