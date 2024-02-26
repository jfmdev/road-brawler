/**
 * Creates a function that returns random boolean values, but whose probabilities changes depending of the previous value
 * in order to avoid long sequences of the same value.
 * 
 * @returns A function that returns biased random boolean values.
 */
export function biasedRandomBooleanFactory() {
  let previous: boolean | null = null;

  return () => {
    const threshold = previous === null ? 0.5 : previous === true ? 0.3 : 0.7;
    const result = Math.random() < threshold;
  
    previous = result;
    return result
  }
}

/**
 * Enumeration utility for movement directions.
 */
export enum Direction {
  LEFT,
  NONE,
  RIGHT
}

/**
 * Type for a function that returns a number.
 */
export type NumberGetter = () => number;

/**
 * Get a random number from an interval.
 * 
 * @param min The minimum number from the interval.
 * @param max The maximum number from the interval.
 * @returns A random number between 'min' (inclusive) and 'max' (exclusive).
 */
export const randomFromInternal = (min: number, max: number) => Math.random() * (max - min) + min;

/**
 * Picks a random item from an array.
 * 
 * @param array An array of strings.
 * @returns A random item from the array.
 */
export function randomItem<Type> (array: Type[]) : Type {
  return array[Math.floor(Math.random() * array.length)];
}
