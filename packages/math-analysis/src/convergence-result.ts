/**
 * What an iterative routine produced, and whether it actually got there.
 *
 * `converged` is the point of the type. A routine that stopped because it ran
 * out of iterations still has a best-so-far answer worth returning, and
 * returning it bare would make that indistinguishable from an answer that met
 * its tolerance. **Check `converged` before trusting `value`.**
 *
 * Routines that return a bare number throw {@link ConvergenceError} instead,
 * because there a caller has no way to notice the shortfall.
 *
 * @example
 * 	```ts
 * 	const result = continuedFractionEval(fraction, { maxIterations: 5 });
 * 	if (!result.converged) {
 * 		// result.value is the best estimate after 5 steps, not the answer.
 * 	}
 * 	```;
 *
 * @see [Convergence and iteration limits](https://anthochamp.github.io/node-essentials/topics/math/calculus/convergence/)
 */
export type ConvergenceResult<T> = {
	/** Best estimate available when the iteration stopped. */
	value: T;

	/** How many iterations ran before stopping. */
	iterations: number;

	/**
	 * Whether the tolerance was met. `false` means the iteration limit was
	 * reached first and {@link ConvergenceResult.value} is unconverged.
	 */
	converged: boolean;
};
