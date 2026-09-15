import { PassThrough, Writable } from "node:stream";

import { expect, suite, test } from "vitest";

import { nodeWriteAsync } from "./write-async.js";

suite("nodeWriteAsync", () => {
	test("resolves once the write completes", async () => {
		const chunks: unknown[] = [];
		const stream = new PassThrough();
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		await nodeWriteAsync(stream, "hello");

		expect(chunks).toEqual(["hello"]);
	});

	test("rejects when the stream errors on write", async () => {
		const stream = new Writable({
			write(_chunk, _encoding, callback) {
				callback(new Error("boom"));
			},
		});
		// The stream owner's responsibility, not writeAsync's: an unhandled
		// "error" event (emitted in addition to the write callback) crashes the
		// process.
		stream.on("error", () => {});

		await expect(nodeWriteAsync(stream, "hello")).rejects.toThrow("boom");
	});

	test("writes a Uint8Array chunk", async () => {
		const chunks: unknown[] = [];
		const stream = new PassThrough();
		stream.on("data", (chunk) => chunks.push(chunk.toString()));

		await nodeWriteAsync(stream, new TextEncoder().encode("bytes"));

		expect(chunks).toEqual(["bytes"]);
	});
});
