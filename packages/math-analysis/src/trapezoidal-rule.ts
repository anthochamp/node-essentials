import { PreciseSum } from "@ac-kit/core";

/**
 * Approximates the area under a curve by slicing it into equal-width trapezoids
 * and adding them up.
 *
 * This is numerical integration at its most direct: `f` is evaluated at evenly
 * spaced points and the curve between consecutive points is replaced by the
 * straight line joining them. Use it when you have a function you can evaluate
 * but cannot integrate symbolically — which is most functions worth
 * integrating.
 *
 * The error is `O(h²)` where `h = (upper − lower) / intervals`, so halving the
 * step quarters the error. That holds until the discretisation error falls
 * below the accumulated rounding error, past which adding panels stops helping;
 * for a smooth integrand over a unit interval that floor arrives around a
 * million panels.
 *
 * O(`intervals`) calls to `f`; O(1) memory — the panels are accumulated, never
 * collected.
 *
 * @example
 * 	```ts
 * 	trapezoidalRule(Math.sin, 0, Math.PI, 10); // 1.9835235375094546
 * 	trapezoidalRule(Math.sin, 0, Math.PI, 1000); // 1.9999983550656624, against an exact 2
 * 	```;
 *
 * @param f The integrand.
 * @param lower Lower limit of integration.
 * @param upper Upper limit of integration.
 * @param intervals Number of panels; must be a positive integer.
 * @returns The approximated integral.
 * @throws {RangeError} When `intervals` is not a positive integer.
 * @see [Numerical integration](https://anthochamp.github.io/node-essentials/topics/math/calculus/quadrature/)
 */
export function trapezoidalRule(
	f: (x: number) => number,
	lower: number,
	upper: number,
	intervals = 1000,
): number {
	if (!Number.isInteger(intervals) || intervals < 1) {
		throw new RangeError(
			`trapezoidalRule: intervals must be a positive integer, got ${intervals}`,
		);
	}

	const step = (upper - lower) / intervals;
	// Halving is exact, so splitting the endpoint term lets every panel go
	// through the accumulator instead of seeding it with a pre-rounded pair.
	const total = new PreciseSum();
	total.add(f(lower) / 2);
	total.add(f(upper) / 2);
	for (let i = 1; i < intervals; i++) {
		total.add(f(lower + i * step));
	}
	return total.value * step;
}
