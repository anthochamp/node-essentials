import { describe, expect, it } from "vitest";

import { twoProductError } from "./two-product.js";
import { fastTwoSumError, twoSumError } from "./two-sum.js";

describe("twoSumError", () => {
	it("recovers the bits a rounded addition dropped", () => {
		const a = 1;
		const b = Number.EPSILON / 2;
		const sum = a + b;

		expect(sum).toBe(1);
		expect(twoSumError(a, b, sum)).toBe(b);
	});

	it("answers zero when the addition was exact", () => {
		expect(twoSumError(0.5, 0.25, 0.75)).toBe(0);
		expect(twoSumError(1, -1, 0)).toBe(0);
	});

	it("needs no ordering between its operands", () => {
		const big = 2 ** 60;
		const small = 3;

		expect(twoSumError(small, big, small + big)).toBe(
			twoSumError(big, small, big + small),
		);
	});

	it("reconstructs the operands exactly", () => {
		const a = 1e17;
		const b = 7.3;
		const sum = a + b;

		expect(sum + twoSumError(a, b, sum)).toBe(sum + (b - (sum - a)));
	});
});

describe("fastTwoSumError", () => {
	it("agrees with twoSumError when the larger operand comes first", () => {
		const a = 2 ** 70;
		const b = 1.5;
		const sum = a + b;

		expect(fastTwoSumError(a, b, sum)).toBe(twoSumError(a, b, sum));
	});
});

describe("twoProductError", () => {
	it("recovers the bits a rounded multiplication dropped", () => {
		const a = 1 + Number.EPSILON;
		const product = a * a;

		expect(product).toBe(1 + 2 * Number.EPSILON);
		expect(twoProductError(a, a, product)).toBe(Number.EPSILON ** 2);
	});

	it("answers zero when the multiplication was exact", () => {
		expect(twoProductError(3, 5, 15)).toBe(0);
		expect(twoProductError(0.5, 0.25, 0.125)).toBe(0);
	});

	it("handles a factor above the splitting limit", () => {
		const huge = 2 ** 1000;
		const a = 1 + Number.EPSILON;
		const product = huge * a;

		expect(twoProductError(huge, a, product)).toBe(0);
	});

	it("stays exact for a large factor with a rounding remainder", () => {
		const a = 2 ** 997 * (1 + Number.EPSILON);
		const b = 1 + Number.EPSILON;
		const product = a * b;

		expect(product + twoProductError(a, b, product)).toBe(product);
		expect(twoProductError(a, b, product)).toBe(2 ** 997 * Number.EPSILON ** 2);
	});
});
