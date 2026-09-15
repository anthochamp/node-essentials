/**
 * A rough standard normal quantile, accurate to about four decimal places.
 *
 * Abramowitz and Stegun 26.2.23. Deliberately not the accurate approximation
 * `@ac-kit/math-stats` exposes as `normalQuantile` — that package sits above
 * this one, and nothing here needs more than a starting point: this feeds a
 * Halley iteration that triples its own correct digits every step, so four
 * decimals in reaches full precision in three.
 *
 * @param probability Probability in `(0, 1)`.
 * @returns The approximate `z` with `Φ(z) = probability`.
 */
export function normalQuantileGuess_(probability: number): number {
	const tail = probability < 0.5 ? probability : 1 - probability;
	const t = Math.sqrt(-2 * Math.log(tail));
	const magnitude =
		t - (2.30753 + 0.27061 * t) / (1 + t * (0.99229 + 0.04481 * t));

	return probability < 0.5 ? -magnitude : magnitude;
}
