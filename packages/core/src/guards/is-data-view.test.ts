import { expect, suite, test } from "vitest";

import { isDataView } from "./is-data-view.js";

suite("isDataView", () => {
	test("should accept data views", () => {
		expect(isDataView(new DataView(new ArrayBuffer(8)))).toBe(true);
	});

	test("should reject typed arrays and raw buffers", () => {
		const buffer = new ArrayBuffer(8);
		expect(isDataView(new Uint8Array(buffer))).toBe(false);
		expect(isDataView(buffer)).toBe(false);
	});

	test("should reject other values", () => {
		expect(isDataView({ byteLength: 8, byteOffset: 0 })).toBe(false);
		expect(isDataView(null)).toBe(false);
		expect(isDataView(undefined)).toBe(false);
	});
});
