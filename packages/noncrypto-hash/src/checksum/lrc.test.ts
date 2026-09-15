import { describe, expect, it } from "vitest";

import { lrc } from "./lrc.js";

describe("lrc", () => {
	it("is 0 for empty input", () => {
		expect(lrc(new Uint8Array(0))).toBe(0);
	});

	it("is the two's-complement negation of a single byte", () => {
		expect(lrc(new Uint8Array([0x02]))).toBe(0xfe);
	});

	it("makes the total sum (including the LRC byte) zero mod 256", () => {
		const data = new Uint8Array([0x3a, 0x01, 0x00, 0x02, 0x11, 0x33]);
		const check = lrc(data);
		let total = check;

		for (const byte of data) {
			total = (total + byte) & 0xff;
		}

		expect(total).toBe(0);
	});
});
