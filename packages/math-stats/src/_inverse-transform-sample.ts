import type { RandomFn } from "@ac-kit/core";

/**
 * One draw by inverse transform: feed a uniform variate through the quantile
 * function.
 *
 * Correct for every family with a quantile, continuous or discrete, which is
 * why it is the default rather than a per-family sampler. It is not the fastest
 * route where a specialised method exists — Marsaglia–Tsang for the gamma, say
 * — but those are worth adding only against a measured need, and adding one
 * later changes nothing a caller can see.
 *
 * @param quantile The distribution's quantile function.
 * @param random Uniform source over `[0, 1)`; defaults to `Math.random`.
 * @returns The drawn value.
 */
export function inverseTransformSample_(
	quantile: (probability: number) => number,
	random?: RandomFn | null,
): number {
	return quantile((random ?? Math.random)());
}
