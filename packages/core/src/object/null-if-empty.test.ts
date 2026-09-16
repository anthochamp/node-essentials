import { describe, expect, it } from "vitest";

import { nullIfEmpty } from "./null-if-empty.js";

describe("nullIfEmpty", () => {
	it("returns null for an absent value", () => {
		expect(nullIfEmpty(null)).toBeNull();
		expect(nullIfEmpty(undefined)).toBeNull();
	});

	it("returns null for an object without own enumerable property", () => {
		expect(nullIfEmpty({})).toBeNull();
		expect(nullIfEmpty(Object.create({ inherited: 1 }) as object)).toBeNull();
	});

	it("returns the object when it has own enumerable properties", () => {
		const value = { a: 1 };
		expect(nullIfEmpty(value)).toBe(value);
	});

	it("treats an empty array as empty", () => {
		expect(nullIfEmpty([])).toBeNull();
		expect(nullIfEmpty([1])).toEqual([1]);
	});
});
