import { PHI, SQRT2 } from "@ac-kit/math-scalar";
import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { continuedFractionEval } from "./continued-fraction-eval.js";

suite("continuedFractionEval", () => {
	test("evaluates the golden ratio's all-ones fraction", () => {
		const result = continuedFractionEval({
			numerator: () => 1,
			denominator: () => 1,
		});

		expect(result.converged).toBe(true);
		expectCloseRelative(result.value, PHI);
	});

	test("evaluates the square root of two", () => {
		// √2 = 1 + 1/(2 + 1/(2 + …)).
		const result = continuedFractionEval({
			numerator: () => 1,
			denominator: (index) => (index === 0 ? 1 : 2),
		});

		expect(result.converged).toBe(true);
		expectCloseRelative(result.value, SQRT2);
	});

	test("evaluates Gauss's arctangent fraction", () => {
		// arctan(x) = x/(1 + x²/(3 + 4x²/(5 + 9x²/(7 + …)))) — a fraction whose
		// leading term is zero, which is the case the algorithm has to rescue.
		const x = 0.5;
		const result = continuedFractionEval({
			numerator: (index) => (index === 1 ? x : (index - 1) ** 2 * x * x),
			denominator: (index) => (index === 0 ? 0 : 2 * index - 1),
		});

		expect(result.converged).toBe(true);
		expectCloseRelative(result.value, Math.atan(x));
	});

	test("reports the iteration count it actually used", () => {
		const result = continuedFractionEval({
			numerator: () => 1,
			denominator: () => 1,
		});

		expect(result.iterations).toBeGreaterThan(0);
		expect(result.iterations).toBeLessThan(300);
	});

	test("reports non-convergence rather than a silently truncated value", () => {
		const result = continuedFractionEval(
			{ numerator: () => 1, denominator: () => 1 },
			{ maxIterations: 2 },
		);

		expect(result.converged).toBe(false);
		expect(result.iterations).toBe(2);
	});

	test("stops early for a loose tolerance", () => {
		const loose = continuedFractionEval(
			{ numerator: () => 1, denominator: () => 1 },
			{ tolerance: 1e-3 },
		);
		const tight = continuedFractionEval({
			numerator: () => 1,
			denominator: () => 1,
		});

		expect(loose.iterations).toBeLessThan(tight.iterations);
	});

	test("throws when the signal is already aborted", () => {
		expect(() =>
			continuedFractionEval(
				{ numerator: () => 1, denominator: () => 1 },
				{ signal: AbortSignal.abort() },
			),
		).toThrow();
	});
});
