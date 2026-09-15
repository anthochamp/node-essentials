import { describe, expect, it } from "vitest";

import { decimalNormalize } from "./_normalize.js";
import { DECIMAL_ZERO } from "./decimal-types.js";

describe("decimalNormalize", () => {
	it("strips trailing zeros so equal values share a representation", () => {
		expect(decimalNormalize(1200n, 0)).toEqual(decimalNormalize(12n, 2));
		expect(decimalNormalize(1200n, 0).precision).toBe(2);
	});

	it("canonicalises zero", () => {
		expect(decimalNormalize(0n, 17)).toBe(DECIMAL_ZERO);
	});
});
