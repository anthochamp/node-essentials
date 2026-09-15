import { describe, expect, it } from "vitest";

import { bigIntDivmod } from "./divmod.js";

const SIGNED_PAIRS: readonly (readonly [bigint, bigint])[] = [
	[7n, 2n],
	[7n, -2n],
	[-7n, 2n],
	[-7n, -2n],
	[6n, 3n],
	[-6n, 3n],
	[0n, 5n],
	[1n, -1n],
];

describe("bigIntDivmod", () => {
	it("satisfies a = q·b + r for every sign combination", () => {
		for (const [dividend, divisor] of SIGNED_PAIRS) {
			const { quotient, remainder } = bigIntDivmod(dividend, divisor);

			expect(quotient * divisor + remainder).toBe(dividend);
		}
	});

	it("rejects a zero divisor", () => {
		expect(() => bigIntDivmod(1n, 0n)).toThrow(RangeError);
	});
});
