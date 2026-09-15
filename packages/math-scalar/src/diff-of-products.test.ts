import { describe, expect, it } from "vitest";

import { diffOfProducts, sumOfProducts } from "./diff-of-products.js";

describe("diffOfProducts", () => {
	it("recovers a determinant the naive expression destroys", () => {
		// Both products round to 2**54 + 2**28; the true determinant is 1.
		const a = 2 ** 27 + 1;
		const b = 2 ** 27 + 1;
		const c = 2 ** 27;
		const d = 2 ** 27 + 2;

		expect(a * b - c * d).toBe(0);
		expect(diffOfProducts(a, b, c, d)).toBe(1);
	});

	it("matches the naive expression when nothing cancels", () => {
		expect(diffOfProducts(3, 5, 2, 4)).toBe(7);
		expect(diffOfProducts(0.5, 0.25, 0.125, 0.5)).toBe(0.0625);
	});

	it("answers zero for genuinely equal products", () => {
		expect(diffOfProducts(7, 11, 11, 7)).toBe(0);
	});

	it("survives factors near the top of the range", () => {
		expect(diffOfProducts(2 ** 1000, 2 ** -1000, 1, 1)).toBe(0);
		expect(diffOfProducts(2 ** 1000, 2 ** -999, 2 ** 1000, 2 ** -1000)).toBe(1);
	});

	it("falls back to the naive answer when a product overflows", () => {
		expect(diffOfProducts(Number.MAX_VALUE, 2, 1, 1)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});
});

describe("sumOfProducts", () => {
	it("recovers a dot product the naive expression destroys", () => {
		const a = 2 ** 27 + 1;
		const b = 2 ** 27 + 1;
		const c = 2 ** 27;
		const d = 2 ** 27 + 2;

		expect(a * b + -c * d).toBe(0);
		expect(sumOfProducts(a, b, -c, d)).toBe(1);
	});

	it("matches the naive expression when nothing cancels", () => {
		expect(sumOfProducts(3, 5, 2, 4)).toBe(23);
	});

	it("is exact for powers of two", () => {
		expect(sumOfProducts(0.5, 0.5, 0.25, 0.25)).toBe(0.3125);
	});
});
