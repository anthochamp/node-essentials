import type { Terminal } from "@ac-kit/app-terminal";
import { EventDispatcherBase } from "@ac-kit/async";
import { expect, suite, test } from "vitest";

import { ReportEvent } from "../events.js";
import { WritableStreamSink } from "./writable-stream-sink.js";

function dataEvent(data: number): ReportEvent<number> {
	return { kind: "data", timestamp: 0, scopeId: null, data };
}

function collectingStream(chunks: string[]): WritableStream<string> {
	return new WritableStream<string>({
		write(chunk) {
			chunks.push(chunk);
		},
	});
}

suite("WritableStreamSink", () => {
	test("should write the formatted line plus eol", async () => {
		const chunks: string[] = [];
		const sink = new WritableStreamSink<number>(collectingStream(chunks), {
			formatter: (event) =>
				event.kind === "data" ? `data:${event.data}` : null,
		});

		await sink.write(dataEvent(1));

		expect(chunks).toEqual(["data:1\n"]);
	});

	test("should use the custom eol", async () => {
		const chunks: string[] = [];
		const sink = new WritableStreamSink<number>(collectingStream(chunks), {
			formatter: () => "line",
			eol: "\r\n",
		});

		await sink.write(dataEvent(1));

		expect(chunks).toEqual(["line\r\n"]);
	});

	test("should write nothing when the formatter returns null", async () => {
		const chunks: string[] = [];
		const sink = new WritableStreamSink<number>(collectingStream(chunks), {
			formatter: () => null,
		});

		await sink.write(dataEvent(1));

		expect(chunks).toEqual([]);
	});

	test("should pass the scope tracker and terminal to the formatter", async () => {
		const chunks: string[] = [];
		let seenTerminal: unknown;
		const terminal: Terminal = {
			interactive: true,
			columns: 80,
			rows: 24,
			colorDepth: 4,
			unicode: true,
			hyperlinks: false,
			resize: new EventDispatcherBase(),
		};
		const sink = new WritableStreamSink<number>(collectingStream(chunks), {
			formatter: (_event, context) => {
				seenTerminal = context.terminal;
				return null;
			},
			terminal,
		});

		await sink.write(dataEvent(1));

		expect(seenTerminal).toBe(terminal);
	});

	test("close() should close the underlying stream", async () => {
		let closed = false;
		const stream = new WritableStream<string>({
			close() {
				closed = true;
			},
		});
		const sink = new WritableStreamSink<number>(stream, {
			formatter: () => null,
		});

		await sink.close();

		expect(closed).toBe(true);
	});
});
