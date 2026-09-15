import { expect, suite, test } from "vitest";

import { isSharedArrayBuffer } from "./is-shared-array-buffer.js";

suite("isSharedArrayBuffer", () => {
	test("should accept shared array buffers", () => {
		expect(isSharedArrayBuffer(new SharedArrayBuffer(8))).toBe(true);
	});

	test("should reject plain array buffers and their views", () => {
		const buffer = new ArrayBuffer(8);
		expect(isSharedArrayBuffer(buffer)).toBe(false);
		expect(isSharedArrayBuffer(new Uint8Array(buffer))).toBe(false);
	});

	test("should reject other values", () => {
		expect(isSharedArrayBuffer({ byteLength: 8 })).toBe(false);
		expect(isSharedArrayBuffer(null)).toBe(false);
		expect(isSharedArrayBuffer(undefined)).toBe(false);
	});
});
