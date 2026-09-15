import { expectCloseRelative } from "@ac-kit/test-util";
import { expect, suite, test } from "vitest";

import { erf } from "./erf.js";
import { erfc } from "./erfc.js";

// References from mpmath, checked identical at 80 and 200 digits. The deep-tail
// entries are the point of the function: `1 - erf(x)` is exactly `0` for every
// one of them.
const REFERENCE: readonly (readonly [x: number, expected: number])[] = [
	[0.5, 0.4795001221869535],
	[1, 0.15729920705028513],
	[2, 0.004677734981047266],
	[6, 2.1519736712498913e-17],
	[10, 2.088487583762545e-45],
	[20, 5.395865611607901e-176],
	[26, 5.663192408856143e-296],
	[-1, 1.8427007929497148],
	[-3, 1.9999779095030015],
];

/**
 * About 45 ulps. Looser than {@link erf}'s because the central region reaches
 * `erfc` through `1 − P`, and at `x = 1` that subtraction discards two and a
 * half bits — the tail entries below, which take the direct upper form, land
 * within three ulps.
 */
const TOLERANCE = 1e-14;

suite("erfc", () => {
	test("matches published values across the whole tail", () => {
		for (const [x, expected] of REFERENCE) {
			expectCloseRelative(erfc(x), expected, TOLERANCE);
		}
	});

	test("is exactly one at the origin", () => {
		expect(erfc(0)).toBe(1);
	});

	test("keeps relative precision where the complement of erf has none", () => {
		// `1 - erf(10)` is exactly 0; the whole reason this function exists.
		expect(1 - erf(10)).toBe(0);
		expect(erfc(10)).toBeGreaterThan(0);
	});

	test("agrees with erf where erf still has significant digits", () => {
		for (const x of [-2, -0.5, 0.25, 1, 2]) {
			expectCloseRelative(erfc(x), 1 - erf(x), 1e-13);
		}
	});

	test("saturates at the bounds", () => {
		expect(erfc(Number.POSITIVE_INFINITY)).toBe(0);
		expect(erfc(Number.NEGATIVE_INFINITY)).toBe(2);
		expect(erfc(1e200)).toBe(0);
		expect(erfc(-1e200)).toBe(2);
	});

	test("propagates NaN", () => {
		expect(erfc(Number.NaN)).toBeNaN();
	});
});
