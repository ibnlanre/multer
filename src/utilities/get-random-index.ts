/**
 * Generates a random index from 0 to max - 1.
 *
 * @param max - The maximum number to generate a random index from.
 */
export function getRandomIndex(max: number): number {
    return Math.floor(Math.random() * max);
}
