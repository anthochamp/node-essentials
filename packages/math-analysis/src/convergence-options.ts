/**
 * When an iterative routine should stop — close enough, too many tries, or
 * cancelled.
 *
 * Every iterative routine in this package takes the same shape, so a caller
 * configures them one way rather than learning a new option object per
 * function. Every field is optional; the defaults are chosen per routine and
 * documented on it.
 *
 * What `tolerance` is measured _against_ is the one thing that necessarily
 * differs — a bracket width, a relative update, a residual — so each function
 * states it on its own parameter rather than here.
 *
 * @example
 * 	```ts
 * 	bisect(f, 0, 2, { tolerance: 1e-6, maxIterations: 50 });
 * 	```;
 *
 * @see [Convergence and iteration limits](https://anthochamp.github.io/node-essentials/topics/math/calculus/convergence/)
 */
export type ConvergenceOptions = {
	/**
	 * Threshold below which the iteration is considered converged. Each routine
	 * documents the quantity it compares against this.
	 */
	tolerance?: number;

	/**
	 * Upper bound on iterations, so an input that never converges still
	 * terminates.
	 */
	maxIterations?: number;

	/**
	 * Aborts the iteration. Checked once per iteration, so the cost is bounded by
	 * `maxIterations` rather than by the work each iteration does.
	 */
	signal?: AbortSignal | null;
};
