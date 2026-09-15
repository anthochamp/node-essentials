import { describe, expect, it } from "vitest";

import { CharsetDecodeStream } from "./charset-decode-stream.js";
import { CharsetEncodeStream } from "./charset-encode-stream.js";

function pump<I>(
	stream: { writable: WritableStream<I> },
	chunks: readonly I[],
): Promise<void> {
	return ReadableStream.from(chunks).pipeTo(stream.writable);
}

describe("CharsetDecodeStream / CharsetEncodeStream", () => {
	it("decodes a latin1 byte stream to a UTF-8 string", async () => {
		const stream = new CharsetDecodeStream("latin1");
		const collected = Array.fromAsync(stream.readable);
		await pump(stream, [Uint8Array.from([0x63, 0x61, 0x66, 0xe9])]);
		expect((await collected).join("")).toBe("caf\u00e9");
	});

	it("encodes a UTF-8 string to latin1 bytes", async () => {
		const stream = new CharsetEncodeStream("latin1");
		const collected = Array.fromAsync(stream.readable);
		await pump(stream, ["caf\u00e9"]);
		const bytes = (await collected).flatMap((chunk) => [...chunk]);
		expect(bytes).toEqual([0x63, 0x61, 0x66, 0xe9]);
	});

	it("carries split multi-byte sequences across chunks", async () => {
		const stream = new CharsetDecodeStream("utf-8");
		const collected = Array.fromAsync(stream.readable);
		// "é" is 0xC3 0xA9 — split across two writes.
		await pump(stream, [
			Uint8Array.from([0x63, 0x61, 0x66, 0xc3]),
			Uint8Array.from([0xa9]),
		]);
		expect((await collected).join("")).toBe("caf\u00e9");
	});

	it("throws on an unsupported charset", () => {
		expect(() => new CharsetDecodeStream("not-a-charset-xyz")).toThrow(
			"unsupported charset",
		);
	});
});
