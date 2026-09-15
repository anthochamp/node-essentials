import { describe, expect, it } from "vitest";

import { adler_32 } from "./adler_32.js";

describe("adler_32", () => {
	it("is 1 for empty input", () => {
		expect(adler_32(new Uint8Array(0))).toBe(1);
	});

	it("matches the well-known checksum of 'Wikipedia'", () => {
		// https://en.wikipedia.org/wiki/Adler-32#Example
		const data = new TextEncoder().encode("Wikipedia");

		expect(adler_32(data)).toBe(0x11e60398);
	});

	it("reduces correctly across the 5552-byte block boundary", () => {
		const data = new Uint8Array(6000).fill(1);
		let a = 1;
		let b = 0;

		for (const byte of data) {
			a = (a + byte) % 65521;
			b = (b + a) % 65521;
		}

		expect(adler_32(data)).toBe(((b << 16) | a) >>> 0);
	});
});
