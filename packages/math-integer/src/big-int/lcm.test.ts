import { describe, expect, it } from "vitest";

import { bigIntGcd } from "./gcd.js";
import { bigIntLcm } from "./lcm.js";

describe("bigIntLcm", () => {
	it("is zero when either operand is zero", () => {
		expect(bigIntLcm(0n, 5n)).toBe(0n);
		expect(bigIntLcm(5n, 0n)).toBe(0n);
	});

	it("satisfies gcd × lcm = |a·b|", () => {
		expect(bigIntLcm(4n, 6n) * bigIntGcd(4n, 6n)).toBe(24n);
	});
});
