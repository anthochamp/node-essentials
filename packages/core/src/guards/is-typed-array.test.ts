import { expect, suite, test } from "vitest";

import { isTypedArray } from "./is-typed-array.js";

suite("isTypedArray", () => {
	test("should accept every typed array flavour", () => {
		expect(isTypedArray(new Uint8Array(1))).toBe(true);
		expect(isTypedArray(new Uint8ClampedArray(1))).toBe(true);
		expect(isTypedArray(new Int32Array(1))).toBe(true);
		expect(isTypedArray(new Float64Array(1))).toBe(true);
		expect(isTypedArray(new BigInt64Array(1))).toBe(true);
	});

	test("should accept a view over a shared buffer", () => {
		expect(isTypedArray(new Uint8Array(new SharedArrayBuffer(8)))).toBe(true);
	});

	test("should reject a data view", () => {
		expect(isTypedArray(new DataView(new ArrayBuffer(8)))).toBe(false);
	});

	test("should reject raw buffers and other values", () => {
		expect(isTypedArray(new ArrayBuffer(8))).toBe(false);
		expect(isTypedArray([1, 2, 3])).toBe(false);
		expect(isTypedArray(null)).toBe(false);
		expect(isTypedArray(undefined)).toBe(false);
	});
});
