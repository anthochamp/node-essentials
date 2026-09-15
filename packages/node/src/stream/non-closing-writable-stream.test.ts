import { PassThrough } from "node:stream";

import { expect, suite, test } from "vitest";

import { nonClosingWritableStream } from "./non-closing-writable-stream.js";

suite("nonClosingWritableStream", () => {
	test("forwards writes to the underlying stream", async () => {
		const chunks: string[] = [];
		const stream = new PassThrough();
		stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));

		const writer = nonClosingWritableStream(stream).getWriter();
		await writer.write("hello");
		await writer.write(" world");

		expect(chunks).toEqual(["hello", " world"]);
	});

	test("close() resolves without ending the underlying stream", async () => {
		const stream = new PassThrough();
		let ended = false;
		stream.on("finish", () => {
			ended = true;
		});

		const writer = nonClosingWritableStream(stream).getWriter();
		await writer.write("hello");
		await writer.close();

		expect(ended).toBe(false);
		expect(stream.writableEnded).toBe(false);
	});

	test("a write after close() still reaches the underlying stream", async () => {
		const chunks: string[] = [];
		const stream = new PassThrough();
		stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString()));

		await nonClosingWritableStream(stream).getWriter().close();
		stream.write("still alive");

		expect(chunks).toEqual(["still alive"]);
	});
});
