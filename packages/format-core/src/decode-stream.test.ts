import { ByteAccumulator } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { DecodeStream } from "./decode-stream.js";
import type { Decoder } from "./decoder.js";

const tokenDecoder: Decoder<string, Uint8Array> = {
	decode(view) {
		const at = view.indexOf(0);
		if (at === -1) return { status: "incomplete" };
		return {
			status: "decoded",
			value: new TextDecoder().decode(view.subarray(0, at)),
			consumed: at + 1,
		};
	},
};

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

/**
 * A `TransformStream`'s writable side starts with backpressure engaged until
 * the readable side is actually pulled from, so writing everything and only
 * then reading deadlocks — the write and the read must run concurrently, as any
 * real `pipeThrough`/`pipeTo` usage naturally does.
 */
async function writeAll(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	chunks: readonly Uint8Array[],
): Promise<void> {
	for (const chunk of chunks) {
		await writer.write(chunk);
	}
	await writer.close();
}

describe("DecodeStream", () => {
	it("decodes values split across writes", async () => {
		const stream = new DecodeStream(tokenDecoder, {
			buffer: new ByteAccumulator(1024),
		});
		const writer = stream.writable.getWriter();

		const [values] = await Promise.all([
			collect(stream.readable),
			writeAll(writer, [
				new TextEncoder().encode("ab\0c"),
				new TextEncoder().encode("d\0"),
			]),
		]);

		expect(values).toStrictEqual(["ab", "cd"]);
	});

	it("errors the stream on truncated input at flush", async () => {
		const stream = new DecodeStream(tokenDecoder, {
			buffer: new ByteAccumulator(1024),
		});
		const writer = stream.writable.getWriter();

		const read = collect(stream.readable);
		await writer.write(new TextEncoder().encode("dangling"));
		// close() itself rejects too, since flush() errors the controller before
		// the writable side finishes closing — expected, and asserted via `read`.
		await writer.close().catch(() => {});
		await expect(read).rejects.toThrow();
	});

	it("routes a recoverable error to onError and keeps decoding", async () => {
		const decoder: Decoder<string, Uint8Array> = {
			decode(view) {
				const at = view.indexOf(0);
				if (at === -1) return { status: "incomplete" };
				const text = new TextDecoder().decode(view.subarray(0, at));
				if (text === "bad") {
					return { status: "error", error: new Error("bad"), consumed: at + 1 };
				}
				return { status: "decoded", value: text, consumed: at + 1 };
			},
		};
		const errors: unknown[] = [];
		const stream = new DecodeStream(decoder, {
			buffer: new ByteAccumulator(1024),
			onError: (error) => errors.push(error),
		});
		const writer = stream.writable.getWriter();

		const [values] = await Promise.all([
			collect(stream.readable),
			writeAll(writer, [new TextEncoder().encode("ok\0bad\0ok2\0")]),
		]);

		expect(values).toStrictEqual(["ok", "ok2"]);
		expect(errors).toHaveLength(1);
	});
});
