import { describe, expect, it } from "vitest";

import { BodyReader } from "./body-reader.js";

async function readAll(
	stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array[]> {
	const out: Uint8Array[] = [];
	const reader = stream.getReader();
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return out;
		out.push(value);
	}
}

describe("BodyReader", () => {
	it("auto-finishes a length body once remaining hits zero", async () => {
		const reader = new BodyReader(
			{ mode: "length", byteLength: 3 },
			{ onBackpressure: () => {} },
		);
		const chunks = readAll(reader.stream);
		const taken = reader.feed(new Uint8Array([1, 2, 3, 4]));
		expect(taken).toBe(3);
		expect(await chunks).toStrictEqual([new Uint8Array([1, 2, 3])]);
	});

	it("does not auto-finish an until-eof body until finishAtEof()", async () => {
		const reader = new BodyReader(
			{ mode: "until-eof" },
			{ onBackpressure: () => {} },
		);
		const chunks = readAll(reader.stream);
		reader.feed(new Uint8Array([1, 2]));
		reader.finishAtEof();
		expect(await chunks).toStrictEqual([new Uint8Array([1, 2])]);
	});

	it("finish() is idempotent after an auto-finish", () => {
		const reader = new BodyReader(
			{ mode: "length", byteLength: 1 },
			{ onBackpressure: () => {} },
		);
		reader.feed(new Uint8Array([1]));
		expect(() => reader.finish()).not.toThrow();
	});

	it("signals backpressure via onBackpressure when the queue fills", () => {
		const events: boolean[] = [];
		const reader = new BodyReader(
			{ mode: "until-eof" },
			{ onBackpressure: (paused) => events.push(paused) },
		);
		// No reader attached, so desiredSize drops below zero after enough enqueues.
		for (let i = 0; i < 5; i++) {
			reader.feed(new Uint8Array([i]));
		}
		expect(events).toContain(true);
	});

	it("discard() errors the stream and is idempotent", async () => {
		const reader = new BodyReader(
			{ mode: "until-eof" },
			{ onBackpressure: () => {} },
		);
		const streamReader = reader.stream.getReader();
		reader.discard(new Error("boom"));
		await expect(streamReader.read()).rejects.toThrow("boom");
		expect(() => reader.discard()).not.toThrow();
	});
});
