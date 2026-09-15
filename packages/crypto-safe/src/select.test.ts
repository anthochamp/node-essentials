import { describe, expect, it } from "vitest";

import { constantTimeSelect } from "./select.js";

describe("constantTimeSelect", () => {
	const ifTrue = new Uint8Array([1, 2, 3, 4]);
	const ifFalse = new Uint8Array([5, 6, 7, 8]);

	it("selects ifTrue when condition is true", () => {
		expect(constantTimeSelect(true, ifTrue, ifFalse)).toEqual(ifTrue);
	});

	it("selects ifFalse when condition is false", () => {
		expect(constantTimeSelect(false, ifTrue, ifFalse)).toEqual(ifFalse);
	});

	it("throws on a length mismatch", () => {
		expect(() =>
			constantTimeSelect(true, new Uint8Array(4), new Uint8Array(5)),
		).toThrow(RangeError);
	});
});
