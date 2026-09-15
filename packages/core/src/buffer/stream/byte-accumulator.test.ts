import { describe, expect, it } from "vitest";

import { BufferOverflowError } from "../../error/buffer-overflow-error.js";
import { ByteAccumulator } from "./byte-accumulator.js";

describe("ByteAccumulator", () => {
	it("should start empty", () => {
		const acc = new ByteAccumulator(64);
		expect(acc.buffered).toBe(0);
		expect(Array.from(acc.view())).toEqual([]);
	});

	it("should append and expose the appended bytes via view", () => {
		const acc = new ByteAccumulator(64);
		acc.append(new Uint8Array([1, 2, 3]));
		expect(acc.buffered).toBe(3);
		expect(Array.from(acc.view())).toEqual([1, 2, 3]);
	});

	it("should append across multiple calls, preserving order", () => {
		const acc = new ByteAccumulator(64);
		acc.append(new Uint8Array([1, 2]));
		acc.append(new Uint8Array([3, 4]));
		expect(Array.from(acc.view())).toEqual([1, 2, 3, 4]);
	});

	it("should consume from the front", () => {
		const acc = new ByteAccumulator(64);
		acc.append(new Uint8Array([1, 2, 3, 4]));
		acc.consume(2);
		expect(acc.buffered).toBe(2);
		expect(Array.from(acc.view())).toEqual([3, 4]);
	});

	it("should reset to empty once fully drained", () => {
		const acc = new ByteAccumulator(64, { initialCapacity: 4 });
		acc.append(new Uint8Array([1, 2]));
		acc.consume(2);
		expect(acc.buffered).toBe(0);
		expect(acc.capacity).toBe(4);
	});

	it("should compact instead of growing when consumed space frees enough room", () => {
		const acc = new ByteAccumulator(64, { initialCapacity: 4 });
		acc.append(new Uint8Array([1, 2, 3, 4]));
		acc.consume(2);
		acc.append(new Uint8Array([5, 6]));
		expect(acc.capacity).toBe(4);
		expect(Array.from(acc.view())).toEqual([3, 4, 5, 6]);
	});

	it("should grow when compaction would not free enough room", () => {
		const acc = new ByteAccumulator(64, { initialCapacity: 4 });
		acc.append(new Uint8Array([1, 2, 3, 4]));
		acc.append(new Uint8Array([5, 6]));
		expect(acc.capacity).toBeGreaterThan(4);
		expect(Array.from(acc.view())).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it("should throw BufferOverflowError past maxSize", () => {
		const acc = new ByteAccumulator(4);
		expect(() => acc.append(new Uint8Array([1, 2, 3, 4, 5]))).toThrow(
			BufferOverflowError,
		);
	});

	it("should take the unconsumed bytes and reset", () => {
		const acc = new ByteAccumulator(64);
		acc.append(new Uint8Array([1, 2, 3]));
		const taken = acc.take();
		expect(Array.from(taken)).toEqual([1, 2, 3]);
		expect(acc.buffered).toBe(0);
	});

	it("should clear everything held", () => {
		const acc = new ByteAccumulator(64);
		acc.append(new Uint8Array([1, 2, 3]));
		acc.clear();
		expect(acc.buffered).toBe(0);
	});

	it("should throw for a non-positive maxSize", () => {
		expect(() => new ByteAccumulator(0)).toThrow(RangeError);
	});
});
