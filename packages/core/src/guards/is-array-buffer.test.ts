import { expect, suite, test } from "vitest";

import { isArrayBuffer } from "./is-array-buffer.js";

suite("isArrayBuffer", () => {
	test("should accept array buffers", () => {
		expect(isArrayBuffer(new ArrayBuffer(0))).toBe(true);
		expect(isArrayBuffer(new ArrayBuffer(8))).toBe(true);
	});

	test("should reject views over a buffer", () => {
		const buffer = new ArrayBuffer(8);
		expect(isArrayBuffer(new Uint8Array(buffer))).toBe(false);
		expect(isArrayBuffer(new DataView(buffer))).toBe(false);
	});

	test("should reject shared array buffers", () => {
		expect(isArrayBuffer(new SharedArrayBuffer(8))).toBe(false);
	});

	test("should reject other values", () => {
		expect(isArrayBuffer({ byteLength: 8 })).toBe(false);
		expect(isArrayBuffer(null)).toBe(false);
		expect(isArrayBuffer(undefined)).toBe(false);
	});
});
