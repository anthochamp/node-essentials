import { describe, expect, it } from "vitest";

import { BitBuilder } from "./bit-builder.js";

describe("BitBuilder", () => {
	it("should write single bits, MSB first", () => {
		const w = new BitBuilder();
		w.writeBit(1);
		w.writeBit(0);
		w.writeBit(1);
		w.writeBit(1);
		w.writeBit(0);
		w.writeBit(0);
		w.writeBit(0);
		w.writeBit(1);
		expect(w.result()).toEqual(new Uint8Array([0b10110001]));
	});

	it("should write the low n bits of a number, MSB first", () => {
		const w = new BitBuilder();
		w.writeBits(5, 4); // 0101
		w.writeBits(3, 4); // 0011
		expect(w.result()).toEqual(new Uint8Array([0b01010011]));
	});

	it("should write the low n bits of a bigint, MSB first", () => {
		const w = new BitBuilder();
		w.writeBits(0x1_ffff_ffffn, 33); // one bit beyond a plain number's 32-bit range
		expect(w.bitLength).toBe(33);
		expect(Array.from(w.result())).toEqual([
			0xff, 0xff, 0xff, 0xff, 0b10000000,
		]);
	});

	it("should throw when n exceeds 32 for a plain number", () => {
		const w = new BitBuilder();
		expect(() => w.writeBits(1, 33)).toThrow(RangeError);
	});

	it("should pad to a byte boundary with align()", () => {
		const w = new BitBuilder();
		w.writeBits(1, 3); // 001
		w.align();
		expect(w.result()).toEqual(new Uint8Array([0b00100000]));
	});

	it("should write every byte of a Uint8Array in order", () => {
		const w = new BitBuilder();
		w.writeBytes(new Uint8Array([0x12, 0x34]));
		expect(w.result()).toEqual(new Uint8Array([0x12, 0x34]));
	});

	it("should report bitLength across full and partial bytes", () => {
		const w = new BitBuilder();
		w.writeBits(1, 3);
		expect(w.bitLength).toBe(3);
	});
});
