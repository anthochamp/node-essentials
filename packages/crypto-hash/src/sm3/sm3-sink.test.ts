import { describe, expect, it } from "vitest";

import { Sm3Sink } from "./sm3-sink.js";
import { sm3 } from "./sm3.js";

/**
 * Writes `message` to `sink` split into `chunkSize`-byte pieces, to exercise
 * the tail-buffering logic across an arbitrary number of `write()` calls rather
 * than always landing on a block boundary.
 */
async function hashInChunks(
	message: Uint8Array,
	chunkSize: number,
): Promise<Uint8Array> {
	const sink = new Sm3Sink();
	const writer = sink.getWriter();

	for (let offset = 0; offset < message.length; offset += chunkSize) {
		await writer.write(message.subarray(offset, offset + chunkSize));
	}

	await writer.close();

	return sink.digest;
}

describe("Sm3Sink against the official GB/T 32905-2016 worked examples", () => {
	it('hashes "abc" (Example 1) written in one piece', async () => {
		const message = new TextEncoder().encode("abc");

		expect((await hashInChunks(message, message.length)).toHex()).toBe(
			"66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0",
		);
	});

	it('hashes "abcd" x16 (Example 2) split across the padding boundary', async () => {
		const message = new TextEncoder().encode("abcd".repeat(16));

		expect((await hashInChunks(message, 30)).toHex()).toBe(
			"debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732",
		);
	});
});

describe("Sm3Sink, chunk boundaries independent of block size", () => {
	it.each([1, 3, 7, 63, 64, 65, 127, 200])(
		"matches the one-shot digest split into %i-byte writes",
		async (chunkSize) => {
			const message = crypto.getRandomValues(new Uint8Array(500));

			expect((await hashInChunks(message, chunkSize)).toHex()).toBe(
				sm3(message).toHex(),
			);
		},
	);

	it("matches the one-shot digest for an empty message", async () => {
		expect((await hashInChunks(new Uint8Array(0), 1)).toHex()).toBe(
			sm3(new Uint8Array(0)).toHex(),
		);
	});
});

describe("Sm3Sink piped from a ReadableStream", () => {
	it("hashes a stream of chunks the same as the one-shot digest", async () => {
		const message = crypto.getRandomValues(new Uint8Array(1000));
		const chunks = [
			message.subarray(0, 100),
			message.subarray(100, 300),
			message.subarray(300),
		];
		const source = new ReadableStream<Uint8Array>({
			start(controller) {
				for (const chunk of chunks) {
					controller.enqueue(chunk);
				}

				controller.close();
			},
		});
		const sink = new Sm3Sink();

		await source.pipeTo(sink);

		expect((await sink.digest).toHex()).toBe(sm3(message).toHex());
	});

	it("rejects digest when the stream aborts", async () => {
		const sink = new Sm3Sink();
		const writer = sink.getWriter();

		await writer.abort(new Error("boom"));

		await expect(sink.digest).rejects.toThrow("boom");
	});
});
