import { expect, suite, test } from "vitest";
import { isDeepEqual } from "./is-deep-equal.js";

suite("deepEqual", () => {
	test("should return true for deeply equal objects", () => {
		const obj1 = { a: 1, b: { c: 2 } };
		const obj2 = { a: 1, b: { c: 2 } };

		expect(isDeepEqual(obj1, obj2)).toBe(true);
	});

	test("should return false for different objects", () => {
		const obj1 = { a: 1, b: { c: 2 } };
		const obj2 = { a: 1, b: { c: 3 } };

		expect(isDeepEqual(obj1, obj2)).toBe(false);
	});

	test("should handle arrays", () => {
		const arr1 = [1, 2, { a: 3 }];
		const arr2 = [1, 2, { a: 3 }];
		const arr3 = [1, 2, { a: 4 }];

		expect(isDeepEqual(arr1, arr2)).toBe(true);
		expect(isDeepEqual(arr1, arr3)).toBe(false);
	});

	test("should handle primitives", () => {
		expect(isDeepEqual(42, 42)).toBe(true);
		expect(isDeepEqual(42, "42")).toBe(false);
		expect(isDeepEqual(null, null)).toBe(true);
		expect(isDeepEqual(null, undefined)).toBe(false);
	});

	test("should handle nested structures", () => {
		const obj1 = { a: [1, 2, { b: 3 }], c: new Set([4, 5]) };
		const obj2 = { a: [1, 2, { b: 3 }], c: new Set([4, 5]) };
		const obj3 = { a: [1, 2, { b: 4 }], c: new Set([4, 5]) };

		expect(isDeepEqual(obj1, obj2)).toBe(true);
		expect(isDeepEqual(obj1, obj3)).toBe(false);
	});
});
