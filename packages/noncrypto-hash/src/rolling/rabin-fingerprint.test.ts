import { describe, expect, it } from "vitest";

import { RabinFingerprint } from "./rabin-fingerprint.js";

describe("RabinFingerprint", () => {
	it("rejects a non-positive-integer windowSize", () => {
		expect(() => new RabinFingerprint(0)).toThrow(RangeError);
		expect(() => new RabinFingerprint(-1)).toThrow(RangeError);
		expect(() => new RabinFingerprint(1.5)).toThrow(RangeError);
	});

	it("rejects a width below 8", () => {
		expect(
			() => new RabinFingerprint(4, { width: 4, polynomial: 0x7n }),
		).toThrow(RangeError);
	});

	it("exposes windowSize as constructed", () => {
		expect(new RabinFingerprint(16).windowSize).toBe(16);
	});

	it("starts at value 0n before any push", () => {
		expect(new RabinFingerprint(4).value).toBe(0n);
	});

	it("returns the updated value from push", () => {
		const rabin = new RabinFingerprint(4);

		expect(rabin.push(0x61)).toBe(rabin.value);
	});

	// With windowSize >= the input length, the departing-byte removal step
	// never triggers, so this degenerates to plain non-reflected GF(2)
	// polynomial division with init=0 — exactly a CRC-16/XMODEM computation
	// (width=16, polynomial=0x1021, init=0, refIn=refOut=false, xorOut=0).
	// Cross-checks against the CRC RevEng catalogue's own published check
	// value (0x31C3 for "123456789"), not a self-referential vector.
	it("degenerates to the CRC-16/XMODEM check value when no byte ever leaves the window", () => {
		const data = new TextEncoder().encode("123456789");
		const rabin = new RabinFingerprint(data.length, {
			width: 16,
			polynomial: 0x1021n,
		});

		for (const byte of data) {
			rabin.push(byte);
		}

		expect(rabin.value).toBe(0x31c3n);
	});

	it("matches a fresh instance recomputed over the same trailing window", () => {
		const windowSize = 8;
		const data = new TextEncoder().encode(
			"the quick brown fox jumps over the lazy dog",
		);

		const rolling = new RabinFingerprint(windowSize);

		for (const byte of data) {
			rolling.push(byte);
		}

		const fresh = new RabinFingerprint(windowSize);

		for (const byte of data.slice(data.length - windowSize)) {
			fresh.push(byte);
		}

		expect(rolling.value).toBe(fresh.value);
	});

	it("keeps matching a fresh recompute at every slide position, not just the end", () => {
		const windowSize = 5;
		const data = new TextEncoder().encode("0123456789abcdef");
		const rolling = new RabinFingerprint(windowSize);

		for (let i = 0; i < data.length; i++) {
			rolling.push(data[i]!);

			if (i < windowSize - 1) {
				continue;
			}

			const fresh = new RabinFingerprint(windowSize);

			for (const byte of data.slice(i - windowSize + 1, i + 1)) {
				fresh.push(byte);
			}

			expect(rolling.value).toBe(fresh.value);
		}
	});

	// Self-referential fixed vector for the default (degree-53) polynomial:
	// this package's own derived polynomial applied to a fixed input, guarding
	// against accidental regressions — not an externally published reference
	// (no single canonical Rabin fingerprint polynomial exists, see
	// rabin-fingerprint.ts's module doc comment).
	it("matches a fixed reference value for the default polynomial", () => {
		const rabin = new RabinFingerprint(4);
		const data = new TextEncoder().encode("buzz");

		for (const byte of data) {
			rabin.push(byte);
		}

		expect(rabin.value).toBe(0x15a5624fc35a99n);
	});
});
