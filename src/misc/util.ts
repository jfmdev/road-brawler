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

/**
 * Picks random items from an array.
 * 
 * @param array An array of strings.
 * @param quantity The number of items to pick.
 * @returns A random sub-array from the array.
 */
export function randomItems<Type> (array: Type[], quantity: number) : Type[] {
  const shuffled = array.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, quantity);
}

/**
 * Creates a function that returns random items from an array, but whose probabilities changes depending of the previous value
 * in order to avoid long sequences of the same value.
 * 
 * @returns A function that returns biased random items from arrays.
 */
export function randomItemsBiasedFactory<Type>() {
  let previous: Type[] = [];

  return (list: Type[], quantity: number): Type[] => {
    let result = randomItems(list, quantity);

    // If current result is same than previous, then try again.
    if(result.every(item => previous.indexOf(item) >= 0)) {
      result = randomItems(list, quantity);
    }
  
    previous = result;
    return result
  }
}
