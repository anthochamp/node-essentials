import { describe, expect, it } from "vitest";

import { createJsonEdits, editJson } from "./edit.js";
import { JsonParseStream } from "./parse-stream.js";
import { parseJson } from "./parse.js";
import { JsonPrintStream } from "./print-stream.js";
import { printJson } from "./print.js";

describe("parseJson / printJson", () => {
	it("round-trips a value", () => {
		const value = { a: 1, b: [true, null] };
		expect(parseJson(printJson(value))).toEqual(value);
	});

	it("throws on invalid JSON", () => {
		expect(() => parseJson("{bad}")).toThrow("parse JSON");
	});
});

describe("editJson", () => {
	it("sets a top-level key", () => {
		const source = '{"a":1,"b":2}';
		const result = editJson(source, ["b"], 99);
		expect(parseJson(result)).toEqual({ a: 1, b: 99 });
	});
});

describe("createJsonEdits", () => {
	it("returns a single full-replace edit", () => {
		const source = '{"a":1}';
		const edits = createJsonEdits(source, ["a"], 2);
		expect(edits).toHaveLength(1);
		expect(edits[0]!.offset).toBe(0);
		expect(edits[0]!.length).toBe(source.length);
	});
});

describe("JsonParseStream / JsonPrintStream", () => {
	it("round-trips through streams", async () => {
		const value = { x: 42, y: [1, 2, 3] };

		const printStream = new JsonPrintStream({ indent: 2 });
		const parseStream = new JsonParseStream();
		const readable = printStream.readable.pipeThrough(parseStream);

		// Writing must not be awaited to completion first: `close()` waits for the
		// flush to enqueue, which backpressures until something drains the readable.
		const writer = printStream.writable.getWriter();
		const written = writer.write(value).then(() => writer.close());

		const reader = readable.getReader();
		const { value: result } = await reader.read();
		await written;

		expect(result).toEqual(value);
	});
});
