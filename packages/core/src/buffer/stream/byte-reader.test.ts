import { describe, expect, it } from "vitest";

import { ByteReader } from "./byte-reader.js";

describe("ByteReader", () => {
	it("should read bytes sequentially, advancing position", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3]));
		expect(reader.readByte()).toBe(1);
		expect(reader.readByte()).toBe(2);
		expect(reader.position).toBe(2);
		expect(reader.remaining).toBe(1);
	});

	it("should throw when reading past the end", () => {
		const reader = new ByteReader(new Uint8Array(0));
		expect(() => reader.readByte()).toThrow(RangeError);
	});

	it("should peek without advancing position", () => {
		const reader = new ByteReader(new Uint8Array([9, 8]));
		expect(reader.peekByte()).toBe(9);
		expect(reader.position).toBe(0);
	});

	it("should throw when peeking past the end", () => {
		const reader = new ByteReader(new Uint8Array(0));
		expect(() => reader.peekByte()).toThrow(RangeError);
	});

	it("should read a run of bytes as a view, advancing position", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3, 4]));
		expect(Array.from(reader.read(3))).toEqual([1, 2, 3]);
		expect(reader.position).toBe(3);
	});

	it("should throw when reading more bytes than remain", () => {
		const reader = new ByteReader(new Uint8Array([1]));
		expect(() => reader.read(2)).toThrow(RangeError);
	});

	it("should report atEnd once every byte is read", () => {
		const reader = new ByteReader(new Uint8Array([1]));
		expect(reader.atEnd).toBe(false);
		reader.readByte();
		expect(reader.atEnd).toBe(true);
	});

	it("should return a fresh, independently-positioned sub-reader", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3, 4, 5]));
		reader.readByte();
		const sub = reader.readSubReader(2);
		expect(sub.byteLength).toBe(2);
		expect(Array.from(sub.read(2))).toEqual([2, 3]);
		expect(reader.position).toBe(3);
	});

	it("should return every remaining byte via peekRemaining without advancing", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3]));
		reader.readByte();
		expect(Array.from(reader.peekRemaining())).toEqual([2, 3]);
		expect(reader.position).toBe(1);
	});

	it("should seek to an absolute position", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3]));
		reader.seek(2);
		expect(reader.readByte()).toBe(3);
	});

	it("should throw when seeking out of range", () => {
		const reader = new ByteReader(new Uint8Array([1, 2, 3]));
		expect(() => reader.seek(-1)).toThrow(RangeError);
		expect(() => reader.seek(4)).toThrow(RangeError);
	});

	it("should accept an initialPosition and validate it", () => {
		expect(new ByteReader(new Uint8Array([1, 2, 3]), 2).position).toBe(2);
		expect(() => new ByteReader(new Uint8Array([1]), 5)).toThrow(RangeError);
	});
});
