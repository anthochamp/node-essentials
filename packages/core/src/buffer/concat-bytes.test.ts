import { describe, expect, it } from "vitest";

import { concatBytes } from "./concat-bytes.js";

describe("concatBytes", () => {
	it("should concatenate arrays passed variadically", () => {
		expect(
			Array.from(
				concatBytes(new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])),
			),
		).toEqual([1, 2, 3, 4, 5]);
	});

	it("should concatenate arrays passed as one array argument", () => {
		expect(
			Array.from(
				concatBytes([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]),
			),
		).toEqual([1, 2, 3, 4, 5]);
	});

	it("should skip empty arrays without affecting the result", () => {
		expect(
			Array.from(
				concatBytes(new Uint8Array(0), new Uint8Array([1]), new Uint8Array(0)),
			),
		).toEqual([1]);
	});

	it("should return an empty array for no input", () => {
		expect(concatBytes()).toHaveLength(0);
	});
});
