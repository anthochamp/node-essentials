/**
 * An iterative routine hit its iteration limit before meeting its tolerance.
 *
 * Thrown only by routines that return a bare value, where a caller has no way
 * to notice the shortfall. Routines returning a {@link ConvergenceResult} report
 * it in `converged` instead and never throw this.
 *
 * Catching it is rarely the right response: it almost always means the input
 * was outside the regime the routine covers, or `maxIterations` was set too low
 * for the accuracy asked of it. Raise one, or loosen the other.
 *
 * @example
 * 	```ts
 * 	regularizedIncompleteGamma(3, 20, { maxIterations: 2 });
 * 	// ConvergenceError: regularizedIncompleteGamma: no convergence after 2 iterations
 * 	```;
 *
 * @see [Convergence and iteration limits](https://anthochamp.github.io/node-essentials/topics/math/calculus/convergence/)
 */
export class ConvergenceError extends Error {
	constructor(
		/** Name of the routine that gave up, so the message names a call site. */
		readonly routine: string,

		/** Iterations that ran before the limit was reached. */
		readonly iterations: number,
	) {
		super(`${routine}: no convergence after ${iterations} iterations`);
		this.name = "ConvergenceError";
	}
}
