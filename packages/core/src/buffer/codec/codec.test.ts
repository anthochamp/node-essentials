import { describe, expect, it } from "vitest";

import { getBigUint64Be } from "./get-big-uint64-be.js";
import { getBigUint64Le } from "./get-big-uint64-le.js";
import { getFloat32Be } from "./get-float32-be.js";
import { getFloat32Le } from "./get-float32-le.js";
import { getFloat64Be } from "./get-float64-be.js";
import { getFloat64Le } from "./get-float64-le.js";
import { getUint32ArrayLe } from "./get-uint32-array-le.js";
import { getUint32Be } from "./get-uint32-be.js";
import { getUint32Le } from "./get-uint32-le.js";
import { setBigUint64ArrayBe } from "./set-big-uint64-array-be.js";
import { setBigUint64ArrayLe } from "./set-big-uint64-array-le.js";
import { setBigUint64Be } from "./set-big-uint64-be.js";
import { setBigUint64Le } from "./set-big-uint64-le.js";
import { setFloat32Be } from "./set-float32-be.js";
import { setFloat32Le } from "./set-float32-le.js";
import { setFloat64Be } from "./set-float64-be.js";
import { setFloat64Le } from "./set-float64-le.js";
import { setUint32ArrayBe } from "./set-uint32-array-be.js";
import { setUint32ArrayLe } from "./set-uint32-array-le.js";
import { setUint32Be } from "./set-uint32-be.js";
import { setUint32Le } from "./set-uint32-le.js";

describe("getUint32Le", () => {
	it("should read the bytes in little-endian order", () => {
		expect(getUint32Le(new Uint8Array([0x78, 0x56, 0x34, 0x12]), 0)).toBe(
			0x12345678,
		);
	});

	it("should read at the given offset", () => {
		expect(getUint32Le(new Uint8Array([0xff, 0x78, 0x56, 0x34, 0x12]), 1)).toBe(
			0x12345678,
		);
	});

	it("should return an unsigned value when the high bit is set", () => {
		expect(getUint32Le(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0)).toBe(
			0xffffffff,
		);
	});

	it("should zero-pad the missing high bytes for a narrower byteLength", () => {
		expect(getUint32Le(new Uint8Array([0x78, 0x56, 0x34, 0x12]), 0, 2)).toBe(
			0x00005678,
		);
	});

	it("should return zero for a byteLength of zero", () => {
		expect(getUint32Le(new Uint8Array([0xff, 0xff]), 0, 0)).toBe(0);
	});
});

describe("getBigUint64Le", () => {
	it("should read the bytes in little-endian order", () => {
		const data = new Uint8Array([
			0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01,
		]);
		expect(getBigUint64Le(data, 0)).toBe(0x0123456789abcdefn);
	});

	it("should return an unsigned value when the high bit is set", () => {
		expect(getBigUint64Le(new Uint8Array(8).fill(0xff), 0)).toBe(
			0xffffffffffffffffn,
		);
	});

	it("should zero-pad the missing high bytes for a narrower byteLength", () => {
		const data = new Uint8Array([
			0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01,
		]);
		expect(getBigUint64Le(data, 0, 3)).toBe(0x0000000000abcdefn);
	});

	it("should return zero for a byteLength of zero", () => {
		expect(getBigUint64Le(new Uint8Array(8).fill(0xff), 0, 0)).toBe(0n);
	});
});

describe("setUint32Le", () => {
	it("should write the bytes in little-endian order", () => {
		const target = new Uint8Array(4);
		setUint32Le(target, 0, 0x12345678);
		expect(Array.from(target)).toEqual([0x78, 0x56, 0x34, 0x12]);
	});

	it("should round-trip through getUint32Le", () => {
		const target = new Uint8Array(4);
		setUint32Le(target, 0, 0xdeadbeef);
		expect(getUint32Le(target, 0)).toBe(0xdeadbeef);
	});
});

describe("setBigUint64Le", () => {
	it("should write the bytes in little-endian order", () => {
		const target = new Uint8Array(8);
		setBigUint64Le(target, 0, 0x0123456789abcdefn);
		expect(Array.from(target)).toEqual([
			0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01,
		]);
	});

	it("should round-trip through getBigUint64Le", () => {
		const target = new Uint8Array(8);
		setBigUint64Le(target, 0, 0xfedcba9876543210n);
		expect(getBigUint64Le(target, 0)).toBe(0xfedcba9876543210n);
	});
});

describe("getUint32Be", () => {
	it("should read the bytes in big-endian order", () => {
		expect(getUint32Be(new Uint8Array([0x12, 0x34, 0x56, 0x78]), 0)).toBe(
			0x12345678,
		);
	});

	it("should read at the given offset", () => {
		expect(getUint32Be(new Uint8Array([0xff, 0x12, 0x34, 0x56, 0x78]), 1)).toBe(
			0x12345678,
		);
	});

	it("should return an unsigned value when the high bit is set", () => {
		expect(getUint32Be(new Uint8Array([0xff, 0xff, 0xff, 0xff]), 0)).toBe(
			0xffffffff,
		);
	});

	it("should read only the leading bytes for a narrower byteLength", () => {
		expect(getUint32Be(new Uint8Array([0x12, 0x34, 0x56, 0x78]), 0, 2)).toBe(
			0x1234,
		);
	});

	it("should return zero for a byteLength of zero", () => {
		expect(getUint32Be(new Uint8Array([0xff, 0xff]), 0, 0)).toBe(0);
	});
});

describe("getBigUint64Be", () => {
	it("should read the bytes in big-endian order", () => {
		const data = new Uint8Array([
			0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
		]);
		expect(getBigUint64Be(data, 0)).toBe(0x0123456789abcdefn);
	});

	it("should return an unsigned value when the high bit is set", () => {
		expect(getBigUint64Be(new Uint8Array(8).fill(0xff), 0)).toBe(
			0xffffffffffffffffn,
		);
	});

	it("should read only the leading bytes for a narrower byteLength", () => {
		const data = new Uint8Array([
			0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
		]);
		expect(getBigUint64Be(data, 0, 3)).toBe(0x012345n);
	});

	it("should return zero for a byteLength of zero", () => {
		expect(getBigUint64Be(new Uint8Array(8).fill(0xff), 0, 0)).toBe(0n);
	});
});

describe("setUint32Be", () => {
	it("should write the bytes in big-endian order", () => {
		const target = new Uint8Array(4);
		setUint32Be(target, 0, 0x12345678);
		expect(Array.from(target)).toEqual([0x12, 0x34, 0x56, 0x78]);
	});

	it("should round-trip through getUint32Be", () => {
		const target = new Uint8Array(4);
		setUint32Be(target, 0, 0xdeadbeef);
		expect(getUint32Be(target, 0)).toBe(0xdeadbeef);
	});
});

describe("setBigUint64Be", () => {
	it("should write the bytes in big-endian order", () => {
		const target = new Uint8Array(8);
		setBigUint64Be(target, 0, 0x0123456789abcdefn);
		expect(Array.from(target)).toEqual([
			0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
		]);
	});

	it("should round-trip through getBigUint64Be", () => {
		const target = new Uint8Array(8);
		setBigUint64Be(target, 0, 0xfedcba9876543210n);
		expect(getBigUint64Be(target, 0)).toBe(0xfedcba9876543210n);
	});
});

describe("setUint32ArrayBe", () => {
	it("should serialize each word as big-endian bytes, in order", () => {
		const words = Uint32Array.from([0x12345678, 0xdeadbeef]);
		const target = new Uint8Array(8);
		setUint32ArrayBe(target, 0, words);
		expect(Array.from(target)).toEqual([
			0x12, 0x34, 0x56, 0x78, 0xde, 0xad, 0xbe, 0xef,
		]);
	});

	it("should write at the given offset", () => {
		const words = Uint32Array.from([0x12345678]);
		const target = new Uint8Array(6).fill(0xff);
		setUint32ArrayBe(target, 1, words);
		expect(Array.from(target)).toEqual([0xff, 0x12, 0x34, 0x56, 0x78, 0xff]);
	});

	it("should truncate to byteLength, byte-granular, without touching bytes past it", () => {
		const words = Uint32Array.from([0x12345678, 0xdeadbeef]);
		const target = new Uint8Array(5).fill(0xaa);
		setUint32ArrayBe(target, 0, words, 5);
		expect(Array.from(target)).toEqual([0x12, 0x34, 0x56, 0x78, 0xde]);
	});

	it("should be a no-op for a byteLength of zero", () => {
		const target = new Uint8Array(0);
		setUint32ArrayBe(target, 0, new Uint32Array(0));
		expect(target).toHaveLength(0);
	});
});

describe("setUint32ArrayLe", () => {
	it("should serialize each word as little-endian bytes, in order", () => {
		const words = Uint32Array.from([0x12345678, 0xdeadbeef]);
		const target = new Uint8Array(8);
		setUint32ArrayLe(target, 0, words);
		expect(Array.from(target)).toEqual([
			0x78, 0x56, 0x34, 0x12, 0xef, 0xbe, 0xad, 0xde,
		]);
	});

	it("should truncate to byteLength, byte-granular, without touching bytes past it", () => {
		const words = Uint32Array.from([0x12345678, 0xdeadbeef]);
		const target = new Uint8Array(5).fill(0xaa);
		setUint32ArrayLe(target, 0, words, 5);
		expect(Array.from(target)).toEqual([0x78, 0x56, 0x34, 0x12, 0xef]);
	});
});

describe("getUint32ArrayLe", () => {
	it("should deserialize each little-endian word, in order", () => {
		const data = Uint8Array.from([
			0x78, 0x56, 0x34, 0x12, 0xef, 0xbe, 0xad, 0xde,
		]);
		expect(Array.from(getUint32ArrayLe(data, 0, 8))).toEqual([
			0x12345678, 0xdeadbeef,
		]);
	});

	it("should read a partial trailing word from its leading bytes alone", () => {
		const data = Uint8Array.from([0x78, 0x56, 0x34, 0x12, 0xef, 0xff]);
		expect(Array.from(getUint32ArrayLe(data, 0, 5))).toEqual([
			0x12345678, 0x000000ef,
		]);
	});

	it("should read from an offset", () => {
		const data = Uint8Array.from([0xff, 0x78, 0x56, 0x34, 0x12]);
		expect(Array.from(getUint32ArrayLe(data, 1, 4))).toEqual([0x12345678]);
	});

	it("should round-trip through setUint32ArrayLe", () => {
		const words = Uint32Array.from([0x12345678, 0x0000beef]);
		const target = new Uint8Array(6);
		setUint32ArrayLe(target, 0, words, 6);
		expect(Array.from(getUint32ArrayLe(target, 0, 6))).toEqual(
			Array.from(words),
		);
	});
});

describe("setBigUint64ArrayBe", () => {
	it("should serialize each word as big-endian bytes, in order", () => {
		const words = BigUint64Array.from([
			0x0123456789abcdefn,
			0xfedcba9876543210n,
		]);
		const target = new Uint8Array(16);
		setBigUint64ArrayBe(target, 0, words);
		expect(Array.from(target)).toEqual([
			0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98,
			0x76, 0x54, 0x32, 0x10,
		]);
	});

	it("should truncate to byteLength, byte-granular, without touching bytes past it", () => {
		const words = BigUint64Array.from([
			0x0123456789abcdefn,
			0xfedcba9876543210n,
		]);
		const target = new Uint8Array(5).fill(0xaa);
		setBigUint64ArrayBe(target, 0, words, 5);
		expect(Array.from(target)).toEqual([0x01, 0x23, 0x45, 0x67, 0x89]);
	});
});

describe("getFloat32Be", () => {
	it("should read the bytes in big-endian order", () => {
		expect(getFloat32Be(new Uint8Array([0x3f, 0x80, 0x00, 0x00]), 0)).toBe(1);
	});

	it("should read at the given offset", () => {
		expect(
			getFloat32Be(new Uint8Array([0xff, 0x3f, 0x80, 0x00, 0x00]), 1),
		).toBe(1);
	});

	it("should read at the given offset from a subarray view (nonzero byteOffset)", () => {
		const backing = new Uint8Array([0xff, 0xff, 0x3f, 0x80, 0x00, 0x00]);
		expect(getFloat32Be(backing.subarray(2), 0)).toBe(1);
	});
});

describe("getFloat32Le", () => {
	it("should read the bytes in little-endian order", () => {
		expect(getFloat32Le(new Uint8Array([0x00, 0x00, 0x80, 0x3f]), 0)).toBe(1);
	});
});

describe("getFloat64Be", () => {
	it("should read the bytes in big-endian order", () => {
		expect(
			getFloat64Be(
				new Uint8Array([0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
				0,
			),
		).toBe(1);
	});

	it("should read at the given offset from a subarray view (nonzero byteOffset)", () => {
		const backing = new Uint8Array([
			0xff, 0xff, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		]);
		expect(getFloat64Be(backing.subarray(2), 0)).toBe(1);
	});
});

describe("getFloat64Le", () => {
	it("should read the bytes in little-endian order", () => {
		expect(
			getFloat64Le(
				new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f]),
				0,
			),
		).toBe(1);
	});
});

describe("setFloat32Be", () => {
	it("should write the bytes in big-endian order", () => {
		const target = new Uint8Array(4);
		setFloat32Be(target, 0, 1);
		expect(Array.from(target)).toEqual([0x3f, 0x80, 0x00, 0x00]);
	});

	it("should round-trip through getFloat32Be", () => {
		const target = new Uint8Array(4);
		setFloat32Be(target, 0, 1.5);
		expect(getFloat32Be(target, 0)).toBe(1.5);
	});
});

describe("setFloat32Le", () => {
	it("should write the bytes in little-endian order", () => {
		const target = new Uint8Array(4);
		setFloat32Le(target, 0, 1);
		expect(Array.from(target)).toEqual([0x00, 0x00, 0x80, 0x3f]);
	});

	it("should round-trip through getFloat32Le", () => {
		const target = new Uint8Array(4);
		setFloat32Le(target, 0, 1.5);
		expect(getFloat32Le(target, 0)).toBe(1.5);
	});
});

describe("setFloat64Be", () => {
	it("should write the bytes in big-endian order", () => {
		const target = new Uint8Array(8);
		setFloat64Be(target, 0, 1);
		expect(Array.from(target)).toEqual([
			0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		]);
	});

	it("should round-trip through getFloat64Be", () => {
		const target = new Uint8Array(8);
		setFloat64Be(target, 0, 1.5);
		expect(getFloat64Be(target, 0)).toBe(1.5);
	});
});

describe("setFloat64Le", () => {
	it("should write the bytes in little-endian order", () => {
		const target = new Uint8Array(8);
		setFloat64Le(target, 0, 1);
		expect(Array.from(target)).toEqual([
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf0, 0x3f,
		]);
	});

	it("should round-trip through getFloat64Le", () => {
		const target = new Uint8Array(8);
		setFloat64Le(target, 0, 1.5);
		expect(getFloat64Le(target, 0)).toBe(1.5);
	});
});

describe("setBigUint64ArrayLe", () => {
	it("should serialize each word as little-endian bytes, in order", () => {
		const words = BigUint64Array.from([0x0123456789abcdefn]);
		const target = new Uint8Array(8);
		setBigUint64ArrayLe(target, 0, words);
		expect(Array.from(target)).toEqual([
			0xef, 0xcd, 0xab, 0x89, 0x67, 0x45, 0x23, 0x01,
		]);
	});

	it("should truncate to byteLength, byte-granular, without touching bytes past it", () => {
		const words = BigUint64Array.from([0x0123456789abcdefn]);
		const target = new Uint8Array(3).fill(0xaa);
		setBigUint64ArrayLe(target, 0, words, 3);
		expect(Array.from(target)).toEqual([0xef, 0xcd, 0xab]);
	});
});
