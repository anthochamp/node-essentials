import { describe, expect, it } from "vitest";

import { decimalFromString } from "./decimal-from-string.js";
import { decimalRoundToContext } from "./decimal-round-to-context.js";
import { Decimal } from "./decimal-types.js";

const format = (value: Readonly<Decimal>): string =>
	`${value.coefficient}e${value.exponent}`;

describe("decimalRoundToContext", () => {
	it("keeps the requested number of significant digits", () => {
		const rounded = decimalRoundToContext(decimalFromString("123456"), {
			precision: 3,
			roundingMode: "half-even",
		});

		expect(format(rounded)).toBe("123e3");
	});

	it("leaves a value alone under unlimited precision", () => {
		const value = decimalFromString("123456");

		expect(
			decimalRoundToContext(value, { precision: 0, roundingMode: "half-even" }),
		).toBe(value);
	});
});
