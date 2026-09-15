import { describe, expect, it } from "vitest";

import { ChunkListBuffer } from "./chunk-list-buffer.js";

function bytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

describe("ChunkListBuffer", () => {
	it("reads a value straddling multiple appended chunks without a contiguous fast path", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("he"));
		buffer.append(bytes("ll"));
		buffer.append(bytes("o"));

		const cursor = buffer.view();
		expect(cursor.remaining).toBe(5);
		expect(cursor.contiguous(5)).toBeNull();
		expect(cursor.readString(5)).toBe("hello");
		expect(cursor.remaining).toBe(0);
	});

	it("takes the contiguous fast path within a single chunk", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("hello"));
		const cursor = buffer.view();
		const fast = cursor.contiguous(5);
		expect(fast).not.toBeNull();
		expect(new TextDecoder().decode(fast!)).toBe("hello");
	});

	it("finds a needle across a chunk boundary via indexOf", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("ab"));
		buffer.append(bytes("cd"));
		const cursor = buffer.view();
		expect(cursor.indexOf("c".charCodeAt(0))).toBe(2);
		expect(cursor.indexOf(bytes("bc"))).toBe(1);
	});

	it("consume() drops fully-consumed chunks and partial offsets into the next view", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("ab"));
		buffer.append(bytes("cd"));
		buffer.consume(3);
		expect(buffer.buffered).toBe(1);
		expect(buffer.view().readString(1)).toBe("d");
	});

	it("take() returns and clears the buffered bytes", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("ab"));
		buffer.append(bytes("cd"));
		const taken = buffer.take();
		expect(new TextDecoder().decode(taken)).toBe("abcd");
		expect(buffer.buffered).toBe(0);
	});

	it("peekByte does not advance the cursor", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("xy"));
		const cursor = buffer.view();
		expect(cursor.peekByte(0)).toBe("x".charCodeAt(0));
		expect(cursor.remaining).toBe(2);
	});

	it("skip advances without copying", () => {
		const buffer = new ChunkListBuffer();
		buffer.append(bytes("xyz"));
		const cursor = buffer.view();
		cursor.skip(1);
		expect(cursor.readString(2)).toBe("yz");
	});
});
