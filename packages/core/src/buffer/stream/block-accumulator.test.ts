import { describe, expect, it } from "vitest";

import { BlockAccumulator } from "./block-accumulator.js";

function collectBlocks(blockSizeBytes: number) {
	const blocks: Uint8Array[] = [];
	const accumulator = new BlockAccumulator(blockSizeBytes, (block, offset) => {
		blocks.push(block.slice(offset, offset + blockSizeBytes));
	});

	return { accumulator, blocks };
}

describe("BlockAccumulator", () => {
	it("buffers a chunk smaller than one block without calling processBlock", () => {
		const { accumulator, blocks } = collectBlocks(4);

		accumulator.absorb(new Uint8Array([1, 2, 3]));

		expect(blocks).toHaveLength(0);
		expect(Array.from(accumulator.tail)).toEqual([1, 2, 3]);
	});

	it("processes a full block as soon as one completes, carrying the remainder", () => {
		const { accumulator, blocks } = collectBlocks(4);

		accumulator.absorb(new Uint8Array([1, 2, 3]));
		accumulator.absorb(new Uint8Array([4, 5]));

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(Array.from(accumulator.tail)).toEqual([5]);
	});

	it("processes every full block a single large chunk completes", () => {
		const { accumulator, blocks } = collectBlocks(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));

		expect(blocks).toEqual([
			new Uint8Array([1, 2, 3, 4]),
			new Uint8Array([5, 6, 7, 8]),
		]);
		expect(Array.from(accumulator.tail)).toEqual([9]);
	});

	it("leaves an empty tail when a chunk lands exactly on a block boundary", () => {
		const { accumulator, blocks } = collectBlocks(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4]));

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(accumulator.tail).toHaveLength(0);
	});

	it("is unaffected by mutating a chunk after absorb() returns", () => {
		const { accumulator, blocks } = collectBlocks(4);
		const chunk = new Uint8Array([1, 2, 3, 4]);

		accumulator.absorb(chunk);
		chunk.fill(0xff);

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
	});

	it("discards the tail on clear, without processing it", () => {
		const { accumulator, blocks } = collectBlocks(4);

		accumulator.absorb(new Uint8Array([1, 2, 3]));
		accumulator.clear();

		expect(accumulator.tail).toHaveLength(0);
		accumulator.absorb(new Uint8Array([4, 5, 6, 7]));
		expect(blocks).toEqual([new Uint8Array([4, 5, 6, 7])]);
	});
});

describe("BlockAccumulator with holdBackFinalBlock", () => {
	function collectBlocksHoldingBack(blockSizeBytes: number) {
		const blocks: Uint8Array[] = [];
		const accumulator = new BlockAccumulator(
			blockSizeBytes,
			(block, offset) => {
				blocks.push(block.slice(offset, offset + blockSizeBytes));
			},
			true,
		);

		return { accumulator, blocks };
	}

	it("keeps a chunk landing exactly on a block boundary as the tail, not flushed", () => {
		const { accumulator, blocks } = collectBlocksHoldingBack(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4]));

		expect(blocks).toHaveLength(0);
		expect(Array.from(accumulator.tail)).toEqual([1, 2, 3, 4]);
	});

	it("flushes only once proven non-final, by more data arriving", () => {
		const { accumulator, blocks } = collectBlocksHoldingBack(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4]));
		accumulator.absorb(new Uint8Array([5]));

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(Array.from(accumulator.tail)).toEqual([5]);
	});

	it("holds back the last of several full blocks a single chunk completes", () => {
		const { accumulator, blocks } = collectBlocksHoldingBack(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(Array.from(accumulator.tail)).toEqual([5, 6, 7, 8]);
	});

	it("matches the default behaviour off a block boundary", () => {
		const { accumulator, blocks } = collectBlocksHoldingBack(4);

		accumulator.absorb(new Uint8Array([1, 2, 3, 4, 5]));

		expect(blocks).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(Array.from(accumulator.tail)).toEqual([5]);
	});
});
