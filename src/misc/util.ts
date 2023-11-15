/**
 * Creates a function that returns random boolean values, but whose probabilities changes depending of the previous value
 * in order to avoid long sequences of the same value.
 * 
 * @returns A funtion that returns biased random boolean values.
 */
export function borderRandomBooleanFactory() {
  let previous: boolean | null = null;

  return () => {
    const threshold = previous === null ? 0.5 : previous === true ? 0.3 : 0.7;
    const result = Math.random() < threshold;
  
    previous = result;
    return result
  }
}

/**
 * Picks a random item from an array.
 * 
 * @param array An array of strings.
 * @returns A random item from the array.
 */
export const pickRandomItem = (array: string[]) => array[Math.floor(Math.random() * array.length)];
