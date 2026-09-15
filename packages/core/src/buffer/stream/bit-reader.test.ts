import { describe, expect, it } from "vitest";

import { BitBuilder } from "./bit-builder.js";
import { BitReader } from "./bit-reader.js";

describe("BitReader", () => {
	it("should read single bits, MSB first", () => {
		const r = new BitReader(new Uint8Array([0b10110001]));
		expect(r.readBit()).toBe(1);
		expect(r.readBit()).toBe(0);
		expect(r.readBit()).toBe(1);
		expect(r.readBit()).toBe(1);
	});

	it("should read multi-bit values, MSB first", () => {
		const r = new BitReader(new Uint8Array([0b01010011]));
		expect(r.readBits(4)).toBe(5); // 0101
		expect(r.readBits(4)).toBe(3); // 0011
	});

	it("should throw when reading past the end", () => {
		const r = new BitReader(new Uint8Array(0));
		expect(() => r.readBit()).toThrow(RangeError);
	});

	it("should throw when n exceeds 32 for readBits", () => {
		const r = new BitReader(new Uint8Array(8));
		expect(() => r.readBits(33)).toThrow(RangeError);
	});

	it("should read wider-than-32-bit values via readBigBits", () => {
		const r = new BitReader(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x80]));
		expect(r.readBigBits(33)).toBe(0x1_ffff_ffffn);
	});

	it("should advance to the next byte boundary with align()", () => {
		const r = new BitReader(new Uint8Array([0xff, 0x12]));
		r.readBits(3);
		r.align();
		expect(r.readByte()).toBe(0x12);
	});

	it("should throw reading bytes when not byte-aligned", () => {
		const r = new BitReader(new Uint8Array([0xff, 0xff]));
		r.readBit();
		expect(() => r.readBytes(1)).toThrow(RangeError);
	});

	it("should report atEnd once every bit is read", () => {
		const r = new BitReader(new Uint8Array([1]));
		expect(r.atEnd).toBe(false);
		r.readBits(8);
		expect(r.atEnd).toBe(true);
	});

	it("should round-trip through BitBuilder", () => {
		const w = new BitBuilder();
		w.writeBits(42, 8);
		w.writeBits(255, 8);
		const r = new BitReader(w.result());
		expect(r.readBits(8)).toBe(42);
		expect(r.readBits(8)).toBe(255);
	});
});
