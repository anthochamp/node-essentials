import { describe, expect, it } from "vitest";

import { bigIntSqrtExact } from "./sqrt-exact.js";

describe("bigIntSqrtExact", () => {
	it("distinguishes perfect squares", () => {
		expect(bigIntSqrtExact(16n)).toBe(4n);
		expect(bigIntSqrtExact(17n)).toBeNull();
		expect(bigIntSqrtExact((10n ** 40n) ** 2n)).toBe(10n ** 40n);
	});
});
