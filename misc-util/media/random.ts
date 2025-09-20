import { scale1, scale1Int } from "./scale.js";

/**
 * Get a random value between min (inclusive) and max (exclusive)
 *
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns A random value between min and max
 */
export function random(min: number, max: number): number {
	return scale1(Math.random(), min, max);
}

/**
 * @deprecated Use `crypto.randomInt` from Node.js standard library instead.
 *
 * Get a random integer between min (inclusive) and max (exclusive)
 *
 * @param min Minimum integer value (inclusive)
 * @param max Maximum integer value (exclusive)
 * @returns A random integer between min and max
 */
export function randomInt(min: number, max: number): number {
	return scale1Int(Math.random(), min, max, "floor");
}
