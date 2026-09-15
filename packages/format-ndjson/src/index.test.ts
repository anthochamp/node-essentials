import type { JsonValue } from "type-fest";
import { describe, expect, it } from "vitest";

import { NdjsonLineError } from "./ndjson-line-decoder.js";
import { NdjsonParseStream } from "./parse-stream.js";
import { parseNdjson } from "./parse.js";
import { NdjsonPrintStream } from "./print-stream.js";
import { printNdjson } from "./print.js";

describe("parseNdjson / printNdjson", () => {
	it("round-trips an array of values", () => {
		const values: JsonValue[] = [{ a: 1 }, { b: 2 }, null];
		expect(parseNdjson(printNdjson(values))).toEqual(values);
	});

	it("skips blank lines", () => {
		expect(parseNdjson('{"a":1}\n\n{"b":2}\n')).toEqual([{ a: 1 }, { b: 2 }]);
	});
});

describe("NdjsonParseStream / NdjsonPrintStream", () => {
	it("round-trips N values through stream pair", async () => {
		const values = [{ x: 1 }, { x: 2 }, { x: 3 }];
		const printStream = new NdjsonPrintStream();
		const parseStream = new NdjsonParseStream(1024);
		const readable = printStream.readable.pipeThrough(parseStream);

		const writer = printStream.writable.getWriter();
		const written = (async () => {
			for (const value of values) {
				await writer.write(value);
			}
			await writer.close();
		})();

		const received: unknown[] = [];
		for await (const value of readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual(values);
	});

	it("reports malformed lines to onError without stopping", async () => {
		const errors: unknown[] = [];
		const parseStream = new NdjsonParseStream(1024, {
			onError: (error) => errors.push(error),
		});

		const writer = parseStream.writable.getWriter();
		const written = writer
			.write(new TextEncoder().encode('{"a":1}\nbad json\n{"b":2}\n'))
			.then(() => writer.close());

		const received: unknown[] = [];
		for await (const value of parseStream.readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual([{ a: 1 }, { b: 2 }]);
		expect(errors).toHaveLength(1);
	});

	it("throws when a bad line arrives and no onError is supplied", async () => {
		const parseStream = new NdjsonParseStream(1024);
		const writer = parseStream.writable.getWriter();
		const written = writer
			.write(new TextEncoder().encode("bad json\n"))
			.then(() => writer.close());

		await expect(
			(async () => {
				for await (const _value of parseStream.readable) {
					// draining is enough to observe the stream error
				}
			})(),
		).rejects.toThrow();
		await expect(written).rejects.toThrow();
	});

	it("reports an over-long line via onError instead of stopping", async () => {
		const errors: unknown[] = [];
		const parseStream = new NdjsonParseStream(10, {
			onError: (error) => errors.push(error),
		});

		const writer = parseStream.writable.getWriter();
		const written = writer
			.write(new TextEncoder().encode('{"a":1}\n{"toolong":true}\n{"b":2}\n'))
			.then(() => writer.close());

		const received: unknown[] = [];
		for await (const value of parseStream.readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual([{ a: 1 }, { b: 2 }]);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toBeInstanceOf(NdjsonLineError);
		expect((errors[0] as NdjsonLineError)?.line).toBe('{"toolong":true}');
	});

	it("emits a trailing line with no terminating newline on flush", async () => {
		const parseStream = new NdjsonParseStream(1024);
		const writer = parseStream.writable.getWriter();
		const written = writer
			.write(new TextEncoder().encode('{"a":1}\n{"b":2}'))
			.then(() => writer.close());

		const received: unknown[] = [];
		for await (const value of parseStream.readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it("skips blank lines through the stream itself, not just parseNdjson", async () => {
		const parseStream = new NdjsonParseStream(1024);
		const writer = parseStream.writable.getWriter();
		const written = writer
			.write(new TextEncoder().encode('{"a":1}\n\n\n{"b":2}\n'))
			.then(() => writer.close());

		const received: unknown[] = [];
		for await (const value of parseStream.readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual([{ a: 1 }, { b: 2 }]);
	});

	it("reassembles a line split across many small chunks", async () => {
		const parseStream = new NdjsonParseStream(1024);
		const writer = parseStream.writable.getWriter();
		const line = '{"value":"hello world"}\n';
		const written = (async () => {
			for (const char of line) {
				await writer.write(new TextEncoder().encode(char));
			}
			await writer.close();
		})();

		const received: unknown[] = [];
		for await (const value of parseStream.readable) {
			received.push(value);
		}
		await written;

		expect(received).toEqual([{ value: "hello world" }]);
	});
});
