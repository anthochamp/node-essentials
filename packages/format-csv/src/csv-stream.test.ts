import { describe, expect, it } from "vitest";

import { CsvParseStream, CsvPrintStream } from "./csv-stream.js";

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

async function parse(chunks: readonly string[]): Promise<string[][]> {
	const stream = new CsvParseStream();
	const writer = stream.writable.getWriter();

	const [rows] = await Promise.all([
		collect(stream.readable),
		(async () => {
			for (const chunk of chunks) {
				await writer.write(new TextEncoder().encode(chunk));
			}
			await writer.close();
		})(),
	]);
	return rows;
}

describe("CsvParseStream", () => {
	it("emits one row per record", async () => {
		expect(await parse(["a,b\r\nc,d\r\n"])).toStrictEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("reassembles a record split across chunks", async () => {
		expect(await parse(["a,b\r\nc,", "d\r\n"])).toStrictEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("keeps a line terminator inside a quoted field", async () => {
		expect(await parse(['"multi\nline",b\r\n'])).toStrictEqual([
			["multi\nline", "b"],
		]);
	});

	it("holds a record open while a quoted field spans chunks", async () => {
		expect(await parse(['"a', "\nb", '",c\r\n'])).toStrictEqual([
			["a\nb", "c"],
		]);
	});

	it("emits a trailing record with no terminator on flush", async () => {
		expect(await parse(["a,b\r\nc,d"])).toStrictEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("reassembles a multi-byte character split across chunks", async () => {
		const stream = new CsvParseStream();
		const writer = stream.writable.getWriter();
		const encoded = new TextEncoder().encode("é,b\r\n");

		const [rows] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write(encoded.slice(0, 1));
				await writer.write(encoded.slice(1));
				await writer.close();
			})(),
		]);

		expect(rows).toStrictEqual([["é", "b"]]);
	});
});

describe("CsvPrintStream", () => {
	it("terminates every record it emits", async () => {
		const stream = new CsvPrintStream();
		const writer = stream.writable.getWriter();

		const [chunks] = await Promise.all([
			collect(stream.readable),
			(async () => {
				await writer.write(["a", "b"]);
				await writer.write(["c,d", null]);
				await writer.close();
			})(),
		]);

		expect(chunks.join("")).toBe('a,b\r\n"c,d",\r\n');
	});
});
