import { describe, expect, it } from "vitest";

import { bigIntDivTrunc } from "./div-trunc.js";

describe("division", () => {
	it("truncates toward zero", () => {
		expect(bigIntDivTrunc(-7n, 2n)).toBe(-3n);
		expect(bigIntDivTrunc(7n, -2n)).toBe(-3n);
	});

	it("rejects a zero divisor", () => {
		expect(() => bigIntDivTrunc(1n, 0n)).toThrow(RangeError);
	});
});
