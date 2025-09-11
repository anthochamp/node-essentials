import { describe, expect, it } from "vitest";
import { defaults } from "./defaults.js";

describe("defaults", () => {
	it("should assign default options", () => {
		const options = defaults({ a: 1 }, { a: 2, b: 2 }, { a: 3, b: 3, c: 3 });

		expect(options).toEqual({ a: 1, b: 2, c: 3 });
	});

	it("should work with undefined and null values", () => {
		const options = defaults({ a: undefined, b: null }, { a: 2, b: 2 }, {
			a: 3,
			b: 3,
			c: 3,
		} as { a: number; b: number | null; c: number });

		expect(options).toEqual({ a: 2, b: null, c: 3 });
	});

	it("should work with multiple types", () => {
		const options = defaults(
			{ a: 1, b: "test", c: true },
			{ a: 2, b: "default", c: false, d: [1, 2, 3] },
			{ a: 3, b: "default2", c: false, d: [4, 5, 6], e: { key: "value" } },
		);

		expect(options).toEqual({
			a: 1,
			b: "test",
			c: true,
			d: [1, 2, 3],
			e: { key: "value" },
		});
	});

	it("should work with an undefined argument", () => {
		const options = defaults(undefined, { a: 2, b: 2 }, { a: 3, b: 3, c: 3 });

		expect(options).toEqual({ a: 2, b: 2, c: 3 });
	});

	it("should work with a single argument", () => {
		const options = defaults({ a: 1, b: 2, c: 3 });

		expect(options).toEqual({ a: 1, b: 2, c: 3 });
	});
});
