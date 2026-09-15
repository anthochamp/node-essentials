import { describe, expect, it } from "vitest";

import { normalQuantile } from "./normal-quantile.js";

describe("normalQuantile", () => {
	// Reference values from Wichura's AS241 algorithm (what Python's
	// `statistics.NormalDist().inv_cdf` implements) — a different algorithm
	// from the Acklam approximation under test, not a restatement of it.
	// Acklam bounds the *relative* error by 1.15e-9, so the tolerance is
	// looser where the quantile itself is large.
	it.each([
		[0.5, 0, 10],
		[0.75, 0.6744897501960817, 9],
		[0.9, 1.2815515655446004, 8],
		[0.95, 1.6448536269514722, 8],
		[0.975, 1.959963984540054, 8],
		[0.99, 2.3263478740408408, 8],
		[0.995, 2.5758293035489004, 8],
		[0.999, 3.090232306167813, 8],
		[0.9999, 3.7190164854557084, 7],
		[1e-6, -4.753424308822899, 7],
		[1e-10, -6.361340902404056, 7],
	] as const)(
		"matches the AS241 reference value for p = %s",
		(probability, expected, digits) => {
			expect(normalQuantile(probability)).toBeCloseTo(expected, digits);
		},
	);

	it("keeps the relative error within Acklam's published bound", () => {
		// Same AS241 references, checked as a relative error so the claim in
		// the doc comment is the thing actually asserted.
		const references = [
			[1e-10, -6.361340902404056],
			[1e-6, -4.753424308822899],
			[0.001, -3.090232306167813],
			[0.0242, -1.9738394633131993],
			[0.2, -0.8416212335729142],
			[0.391, -0.27671363673674687],
			[0.75, 0.6744897501960817],
			[0.975, 1.9599639845400536],
			[0.9999, 3.7190164854557084],
		] as const;

		for (const [probability, expected] of references) {
			const relativeError = Math.abs(
				(normalQuantile(probability) - expected) / expected,
			);
			expect(relativeError).toBeLessThan(1.15e-9);
		}
	});

	it("is antisymmetric around p = 0.5", () => {
		expect(normalQuantile(0.25)).toBeCloseTo(-normalQuantile(0.75), 12);
		expect(normalQuantile(0.001)).toBeCloseTo(-normalQuantile(0.999), 12);
	});

	it("is increasing", () => {
		const quantiles = [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99].map(normalQuantile);
		for (let index = 1; index < quantiles.length; index++) {
			expect(quantiles[index]).toBeGreaterThan(quantiles[index - 1]!);
		}
	});

	it("returns infinite quantiles at the boundaries", () => {
		expect(normalQuantile(0)).toBe(Number.NEGATIVE_INFINITY);
		expect(normalQuantile(1)).toBe(Number.POSITIVE_INFINITY);
	});

	it("returns NaN for NaN", () => {
		expect(normalQuantile(Number.NaN)).toBeNaN();
	});

	it("rejects a probability outside [0, 1]", () => {
		expect(() => normalQuantile(-0.1)).toThrow(RangeError);
		expect(() => normalQuantile(1.1)).toThrow(RangeError);
	});
});
