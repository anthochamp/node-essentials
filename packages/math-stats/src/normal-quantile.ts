import { erfc } from "@ac-kit/math-analysis";
import { SQRT1_2, SQRT_TWO_PI } from "@ac-kit/math-scalar";

// Coefficients of Acklam's rational approximation to the inverse standard
// normal CDF, as published in "An algorithm for computing the inverse normal
// cumulative distribution function" (Peter J. Acklam). The approximation is
// split into a central region and a tail region, each with its own rational
// function.
const CENTRAL_NUMERATOR = [
	-3.969_683_028_665_376e1, 2.209_460_984_245_205e2, -2.759_285_104_469_687e2,
	1.383_577_518_672_69e2, -3.066_479_806_614_716e1, 2.506_628_277_459_239,
] as const;
const CENTRAL_DENOMINATOR = [
	-5.447_609_879_822_406e1, 1.615_858_368_580_409e2, -1.556_989_798_598_866e2,
	6.680_131_188_771_972e1, -1.328_068_155_288_572e1,
] as const;
const TAIL_NUMERATOR = [
	-7.784_894_002_430_293e-3, -3.223_964_580_411_365e-1, -2.400_758_277_161_838,
	-2.549_732_539_343_734, 4.374_664_141_464_968, 2.938_163_982_698_783,
] as const;
const TAIL_DENOMINATOR = [
	7.784_695_709_041_462e-3, 3.224_671_290_700_398e-1, 2.445_134_137_142_996,
	3.754_408_661_907_416,
] as const;

/**
 * Boundary between the central and tail regions of the approximation, chosen by
 * Acklam so both rational functions stay in their accurate range.
 */
const TAIL_CUTOFF = 0.024_25;

/**
 * Inverse of the standard normal cumulative distribution function (the probit
 * function): the value `x` such that a standard normal variable falls at or
 * below `x` with probability `probability`.
 *
 * Acklam's rational approximation, whose relative error is bounded by 1.15e-9,
 * refined by a single Halley step against `erfc`. That step triples the correct
 * digits, so the result is accurate to the last few bits rather than to nine
 * decimals — which matters because the error is _relative_, and the absolute
 * error of the bare approximation grows with the quantile, reaching about 7e-9
 * out at `p = 1e-12`.
 *
 * @param probability Probability in `[0, 1]`.
 * @returns The quantile; `-Infinity` for `0`, `Infinity` for `1`, `NaN` for
 *   `NaN`.
 * @throws {RangeError} When `probability` is outside `[0, 1]`.
 */
export function normalQuantile(probability: number): number {
	if (Number.isNaN(probability)) {
		return Number.NaN;
	}
	if (probability === 0) {
		return Number.NEGATIVE_INFINITY;
	}
	if (probability === 1) {
		return Number.POSITIVE_INFINITY;
	}
	if (probability < 0 || probability > 1) {
		throw new RangeError(
			`normalQuantile: probability must be in [0, 1], got ${probability}`,
		);
	}

	return polish(approximate(probability), probability);
}

/**
 * One Halley step on `Φ(x) − p`, whose first two derivatives are the density
 * and `−x` times it — so the correction costs one `erfc` and no extra
 * transcendental.
 *
 * The residual is taken against whichever tail is the small one, since `Φ(x)`
 * itself rounds to 1 well before the upper tail stops mattering.
 */
function polish(guess: number, probability: number): number {
	const scaled = guess * SQRT1_2;
	const residual =
		probability <= 0.5
			? 0.5 * erfc(-scaled) - probability
			: 1 - probability - 0.5 * erfc(scaled);

	const density = Math.exp(-0.5 * guess * guess) / SQRT_TWO_PI;
	if (density === 0) {
		return guess;
	}

	const newton = residual / density;

	return guess - newton / (1 - 0.5 * newton * guess);
}

/** Acklam's approximation, accurate to about nine digits on its own. */
function approximate(probability: number): number {
	if (probability < TAIL_CUTOFF) {
		return tailQuantile(probability);
	}
	if (probability > 1 - TAIL_CUTOFF) {
		return -tailQuantile(1 - probability);
	}

	// Central region: rational function in r = (p - 1/2)², multiplied by
	// q = p - 1/2 to restore the sign the squaring removed.
	const offset = probability - 0.5;
	const squared = offset * offset;
	const numerator = horner(CENTRAL_NUMERATOR, squared) * offset;
	const denominator = horner(CENTRAL_DENOMINATOR, squared) * squared + 1;
	return numerator / denominator;
}

/** Tail branch of Acklam's approximation, for `probability < TAIL_CUTOFF`. */
function tailQuantile(probability: number): number {
	const q = Math.sqrt(-2 * Math.log(probability));
	const numerator = horner(TAIL_NUMERATOR, q);
	const denominator = horner(TAIL_DENOMINATOR, q) * q + 1;
	return numerator / denominator;
}

/**
 * Evaluates the polynomial `coefficients[0]·xⁿ⁻¹ + … + coefficients[n-1]` by
 * Horner's method, coefficients highest-degree first.
 */
function horner(coefficients: readonly number[], x: number): number {
	let result = coefficients[0]!;
	for (let index = 1; index < coefficients.length; index++) {
		result = result * x + coefficients[index]!;
	}
	return result;
}
