import { describe, expect, it } from "vitest";

import { Buzhash } from "./buzhash.js";

describe("Buzhash", () => {
	it("rejects a non-positive-integer windowSize", () => {
		expect(() => new Buzhash(0)).toThrow(RangeError);
		expect(() => new Buzhash(-1)).toThrow(RangeError);
		expect(() => new Buzhash(1.5)).toThrow(RangeError);
	});

	it("exposes windowSize as constructed", () => {
		expect(new Buzhash(16).windowSize).toBe(16);
	});

	it("starts at value 0 before any push", () => {
		expect(new Buzhash(4).value).toBe(0);
	});

	it("returns the updated value from push", () => {
		const buzhash = new Buzhash(4);

		expect(buzhash.push(0x61)).toBe(buzhash.value);
	});

	it("matches a fresh instance recomputed over the same trailing window", () => {
		const windowSize = 8;
		const data = new TextEncoder().encode(
			"the quick brown fox jumps over the lazy dog",
		);

		const rolling = new Buzhash(windowSize);

		for (const byte of data) {
			rolling.push(byte);
		}

		const fresh = new Buzhash(windowSize);

		for (const byte of data.slice(data.length - windowSize)) {
			fresh.push(byte);
		}

		expect(rolling.value).toBe(fresh.value);
	});

	it("keeps matching a fresh recompute at every slide position, not just the end", () => {
		const windowSize = 5;
		const data = new TextEncoder().encode("0123456789abcdef");
		const rolling = new Buzhash(windowSize);

		for (let i = 0; i < data.length; i++) {
			rolling.push(data[i]!);

			if (i < windowSize - 1) {
				continue;
			}

			const fresh = new Buzhash(windowSize);

			for (const byte of data.slice(i - windowSize + 1, i + 1)) {
				fresh.push(byte);
			}

			expect(rolling.value).toBe(fresh.value);
		}
	});

	// Self-referential fixed vector: this package's own table/algorithm
	// applied to a fixed input, guarding against accidental regressions — not
	// an externally published reference (none exists for Buzhash's table,
	// see buzhash.ts's module doc comment).
	it("matches a fixed reference value for this package's own table", () => {
		const buzhash = new Buzhash(4);
		const data = new TextEncoder().encode("buzz");

		for (const byte of data) {
			buzhash.push(byte);
		}

		expect(buzhash.value).toBe(0x92fa2d8b);
	});
});
