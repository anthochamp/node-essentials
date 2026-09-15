import { describe, expect, it } from "vitest";

import { RabinKarpHash } from "./rabin-karp-hash.js";

describe("RabinKarpHash", () => {
	it("rejects a non-positive-integer windowSize", () => {
		expect(() => new RabinKarpHash(0)).toThrow(RangeError);
		expect(() => new RabinKarpHash(-1)).toThrow(RangeError);
		expect(() => new RabinKarpHash(1.5)).toThrow(RangeError);
	});

	it("exposes windowSize as constructed", () => {
		expect(new RabinKarpHash(16).windowSize).toBe(16);
	});

	it("starts at value 0n before any push", () => {
		expect(new RabinKarpHash(4).value).toBe(0n);
	});

	it("returns the updated value from push", () => {
		const rabinKarp = new RabinKarpHash(4);

		expect(rabinKarp.push(0x61)).toBe(rabinKarp.value);
	});

	// windowSize=1 makes base^(windowSize-1) == 1, so the departing byte's
	// full contribution is always cancelled: the recurrence degenerates to
	// `value == byteIn mod modulus` on every push. A hand-derivable identity,
	// not dependent on any external test vector.
	it("degenerates to `value == byteIn mod modulus` when windowSize is 1", () => {
		const rabinKarp = new RabinKarpHash(1);

		for (const byte of [0x00, 0x01, 0x7f, 0xff, 0x42]) {
			expect(rabinKarp.push(byte)).toBe(BigInt(byte));
		}
	});

	// With windowSize >= the input length, removal never triggers, so this
	// must equal a direct, independently written Horner's-method computation
	// of the same textbook formula.
	it("degenerates to a direct Horner computation when no byte ever leaves the window", () => {
		const base = 257n;
		const modulus = 1_000_000_009n;
		const data = new TextEncoder().encode("the quick brown fox");
		const rabinKarp = new RabinKarpHash(data.length, { base, modulus });

		for (const byte of data) {
			rabinKarp.push(byte);
		}

		let expected = 0n;

		for (const byte of data) {
			expected = (expected * base + BigInt(byte)) % modulus;
		}

		expect(rabinKarp.value).toBe(expected);
	});

	it("matches a fresh instance recomputed over the same trailing window", () => {
		const windowSize = 8;
		const data = new TextEncoder().encode(
			"the quick brown fox jumps over the lazy dog",
		);

		const rolling = new RabinKarpHash(windowSize);

		for (const byte of data) {
			rolling.push(byte);
		}

		const fresh = new RabinKarpHash(windowSize);

		for (const byte of data.slice(data.length - windowSize)) {
			fresh.push(byte);
		}

		expect(rolling.value).toBe(fresh.value);
	});

	it("keeps matching a fresh recompute at every slide position, not just the end", () => {
		const windowSize = 5;
		const data = new TextEncoder().encode("0123456789abcdef");
		const rolling = new RabinKarpHash(windowSize);

		for (let i = 0; i < data.length; i++) {
			rolling.push(data[i]!);

			if (i < windowSize - 1) {
				continue;
			}

			const fresh = new RabinKarpHash(windowSize);

			for (const byte of data.slice(i - windowSize + 1, i + 1)) {
				fresh.push(byte);
			}

			expect(rolling.value).toBe(fresh.value);
		}
	});
});
