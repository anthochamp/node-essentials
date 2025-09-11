import { isDeepStrictEqual } from "node:util";
import { UnsupportedError } from "../error/unsupported-error.js";
import type { IsEqualWellKnownStrategy } from "./is-equal.js";

/**
 * Compare two values for deep equality using the specified strategy.
 *
 * @param a First value to compare
 * @param b Second value to compare
 * @param strategy The equality comparison strategy to use (default is "strict")
 * @returns True if the values are deeply equal, false otherwise
 */
export function isDeepEqual(
	a: unknown,
	b: unknown,
	strategy: Extract<IsEqualWellKnownStrategy, "strict"> = "strict",
): boolean {
	if (strategy !== "strict") {
		throw new UnsupportedError(`strategy "${strategy}"`);
	}

	return isDeepStrictEqual(a, b);
}
