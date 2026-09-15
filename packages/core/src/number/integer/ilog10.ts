import { ipow10 } from "./ipow10.js";

/**
 * Floor of log₁₀ for a **positive integer** `number` value.
 *
 * Backward-scans the powers of ten below `Number.MAX_SAFE_INTEGER` — O(19) =
 * O(1).
 *
 * @example
 * 	```ts
 * 	ilog10(1); // → 0
 * 	ilog10(9); // → 0
 * 	ilog10(10); // → 1
 * 	ilog10(999); // → 2
 * 	```;
 *
 * @param n - Must satisfy `n >= 1`; negative / zero / non-integer input is
 *   undefined behaviour.
 * @returns Floor of log₁₀(n), i.e. the number of decimal digits minus one.
 */
export function ilog10(n: number): number {
	// Scan backward so the common case (small numbers) exits early for large n
	// and the scan terminates as soon as we find floor(log10).
	for (let i = 18; i >= 1; i--) {
		const threshold = ipow10(i);
		if (threshold !== null && n >= threshold) return i;
	}
	return 0;
}
