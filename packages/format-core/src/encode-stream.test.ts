import { describe, expect, it } from "vitest";

import { EncodeStream } from "./encode-stream.js";
import type { Encoder } from "./encoder.js";

async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
	const out: T[] = [];
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			return out;
		}
		out.push(value);
	}
}

describe("EncodeStream", () => {
	it("enqueues one chunk per encoded value", async () => {
		const encoder: Encoder<string> = {
			encode: (value) => new TextEncoder().encode(value),
		};
		const stream = new EncodeStream(encoder);
		const writer = stream.writable.getWriter();

		const [chunks] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write("ab");
				await writer.write("cd");
				await writer.close();
			})(),
		]);

		expect(
			chunks.map((chunk) => new TextDecoder().decode(chunk)),
		).toStrictEqual(["ab", "cd"]);
	});

	it("enqueues a vectored return as separate chunks, without concatenating", async () => {
		const delimiter = new Uint8Array([0]);
		const encoder: Encoder<string> = {
			encode: (value) => [new TextEncoder().encode(value), delimiter],
		};
		const stream = new EncodeStream(encoder);
		const writer = stream.writable.getWriter();

		const [chunks] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write("hi");
				await writer.close();
			})(),
		]);

		expect(chunks).toStrictEqual([new TextEncoder().encode("hi"), delimiter]);
	});
});
