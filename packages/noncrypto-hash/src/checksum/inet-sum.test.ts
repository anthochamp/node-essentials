import { describe, expect, it } from "vitest";

import { inetSum } from "./inet-sum.js";

describe("inetSum", () => {
	it("is 0xffff for an all-zero word", () => {
		expect(inetSum(new Uint8Array([0x00, 0x00]))).toBe(0xffff);
	});

	it("is 0x0000 for an all-one word", () => {
		expect(inetSum(new Uint8Array([0xff, 0xff]))).toBe(0x0000);
	});

	it("pads an odd-length input with an implicit zero byte", () => {
		// 0xff -> word 0xff00; complement of 0xff00 is 0x00ff.
		expect(inetSum(new Uint8Array([0xff]))).toBe(0x00ff);
	});

	it("folds an end-around carry out of bit 16", () => {
		// 0xffff + 0x0001 carries out of bit 16, folded back in: 0x0000 + 1 = 1.
		const data = new Uint8Array([0xff, 0xff, 0x00, 0x01]);

		expect(inetSum(data)).toBe(~1 & 0xffff);
	});

	it("verifies to zero when the checksum is appended to the data it covers", () => {
		// RFC 1071 §1's verification identity: summing the data together with its
		// own checksum field always yields zero.
		const data = new Uint8Array([
			0x45, 0x00, 0x00, 0x3c, 0x1c, 0x46, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00,
			0xac, 0x10, 0x0a, 0x63, 0xac, 0x10, 0x0a, 0x0c,
		]);
		const checksum = inetSum(data);
		const withChecksum = new Uint8Array(data);

		withChecksum[10] = (checksum >>> 8) & 0xff;
		withChecksum[11] = checksum & 0xff;

		expect(inetSum(withChecksum)).toBe(0);
	});
});
