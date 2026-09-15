import { describe, expect, it } from "vitest";

import { chunkBytes } from "./chunk-bytes.js";

describe("chunkBytes", () => {
	it("splits into equal-size chunks when the length divides evenly", () => {
		const chunks = chunkBytes(new Uint8Array([1, 2, 3, 4, 5, 6]), 2);
		expect(chunks.map((chunk) => Array.from(chunk))).toEqual([
			[1, 2],
			[3, 4],
			[5, 6],
		]);
	});

	it("keeps a shorter final chunk when the length does not divide evenly", () => {
		const chunks = chunkBytes(new Uint8Array([1, 2, 3, 4, 5]), 2);
		expect(chunks.map((chunk) => Array.from(chunk))).toEqual([
			[1, 2],
			[3, 4],
			[5],
		]);
	});

	it("returns a single chunk when size is at least the input length", () => {
		const chunks = chunkBytes(new Uint8Array([1, 2, 3]), 10);
		expect(chunks.map((chunk) => Array.from(chunk))).toEqual([[1, 2, 3]]);
	});

	it("returns an empty array for empty input", () => {
		expect(chunkBytes(new Uint8Array(0), 4)).toHaveLength(0);
	});

	it("returns subarrays backed by the same buffer, not copies", () => {
		const bytes = new Uint8Array([1, 2, 3, 4]);
		const [chunk] = chunkBytes(bytes, 2);
		bytes[0] = 99;
		expect(chunk?.[0]).toBe(99);
	});
});
