import { describe, expect, it } from "vitest";

import {
	textPrintTransformer,
	wholeTextParseTransformer,
} from "./whole-buffer-transform.js";

/**
 * A `TransformStream`'s writable side starts with backpressure engaged until
 * the readable side is actually pulled from, so writing everything and only
 * then reading deadlocks — read and write must run concurrently.
 */
async function collect<T>(stream: ReadableStream<T>): Promise<T[]> {
	const out: T[] = [];
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return out;
		out.push(value);
	}
}

describe("wholeTextParseTransformer", () => {
	it("buffers every chunk and parses once on flush", async () => {
		const stream = new TransformStream(
			wholeTextParseTransformer((text) => JSON.parse(text), "JSON"),
		);
		const writer = stream.writable.getWriter();

		const [values] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write(new TextEncoder().encode('{"a":'));
				await writer.write(new TextEncoder().encode("1}"));
				await writer.close();
			})(),
		]);

		expect(values).toEqual([{ a: 1 }]);
	});

	it("wraps a parse error with the given label", async () => {
		const stream = new TransformStream(
			wholeTextParseTransformer((text) => JSON.parse(text), "JSON"),
		);
		const writer = stream.writable.getWriter();

		const read = collect(stream.readable);
		await writer.write(new TextEncoder().encode("not json"));
		await writer.close().catch(() => {});

		await expect(read).rejects.toThrow("parse JSON");
	});
});

describe("textPrintTransformer", () => {
	it("encodes each value as a UTF-8 chunk", async () => {
		const stream = new TransformStream(
			textPrintTransformer((value: number) => `${value}\n`, "number"),
		);
		const writer = stream.writable.getWriter();

		const [chunks] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write(1);
				await writer.write(2);
				await writer.close();
			})(),
		]);

		expect(
			chunks.map((chunk) => new TextDecoder().decode(chunk)),
		).toStrictEqual(["1\n", "2\n"]);
	});
});
