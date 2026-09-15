import type { ConvergenceOptions } from "./convergence-options.js";

/**
 * Finds where a function crosses zero, by repeatedly halving an interval known
 * to contain the crossing.
 *
 * You give it two points where `f` has opposite signs. Somewhere between them
 * the function must pass through zero, so the answer is somewhere in that
 * interval; bisection tries the midpoint, keeps whichever half still straddles
 * zero, and repeats. Slow but incapable of failing — unlike Newton's method,
 * which needs a derivative and can wander off from a bad start with no
 * warning.
 *
 * Use it when reliability matters more than speed, when `f` is expensive to
 * differentiate, or when you have no idea what the function looks like between
 * the endpoints.
 *
 * The error after `n` steps is at most `(upper − lower) / 2ⁿ`, so each step
 * buys one bit. Reaching `1e-12` from a bracket of width 2 takes about 41.
 *
 * O(log₂((upper − lower) / tolerance)) calls to `f`, capped at `maxIterations`;
 * O(1) memory.
 *
 * @example
 * 	```ts
 * 	bisect((x) => x * x - 2, 0, 2); // 1.414213562372879, against √2 = 1.4142135623730951
 * 	bisect((x) => x * x - 2, 2, 3); // throws RangeError — no sign change
 * 	```;
 *
 * @param f The continuous function whose root is sought.
 * @param lower Lower end of the bracket.
 * @param upper Upper end of the bracket.
 * @param options Termination criteria. `tolerance` is the absolute bracket
 *   width to stop at, defaulting to `1e-12`; `maxIterations` defaults to 200.
 * @returns An approximation of the root.
 * @throws {RangeError} When `f(lower)` and `f(upper)` have the same sign, so
 *   nothing guarantees a root between them.
 * @see [Root finding](https://anthochamp.github.io/node-essentials/topics/math/calculus/root-finding/)
 */
export function bisect(
	f: (x: number) => number,
	lower: number,
	upper: number,
	options?: ConvergenceOptions,
): number {
	const tolerance = options?.tolerance ?? 1e-12;
	const maxIterations = options?.maxIterations ?? 200;
	const { signal } = options ?? {};

	let a = lower;
	let b = upper;
	let fa = f(a);
	const fb = f(b);

	if (fa === 0) {
		return a;
	}
	if (fb === 0) {
		return b;
	}
	if (fa * fb > 0) {
		throw new RangeError(
			"bisect: the bracket endpoints must have opposite signs",
		);
	}

	for (let i = 0; i < maxIterations && b - a > tolerance; i++) {
		signal?.throwIfAborted();

		const midpoint = a + (b - a) / 2;
		const fm = f(midpoint);
		if (fm === 0) {
			return midpoint;
		}
		if (fa * fm < 0) {
			b = midpoint;
		} else {
			a = midpoint;
			fa = fm;
		}
	}

	return a + (b - a) / 2;
}
