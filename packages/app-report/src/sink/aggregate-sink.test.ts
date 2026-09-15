import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import { AggregateSink } from "./aggregate-sink.js";

function dataEvent(data: number, timestamp = 0): ReportEvent<number> {
	return { kind: "data", timestamp, scopeId: null, data };
}

function collectingStream(chunks: string[]): WritableStream<string> {
	return new WritableStream<string>({
		write(chunk) {
			chunks.push(chunk);
		},
	});
}

suite("AggregateSink", () => {
	test("renders the whole run's snapshot once, at close", async () => {
		const chunks: string[] = [];
		const sink = new AggregateSink<number>(collectingStream(chunks), {
			formatter: (run) => `count=${run.data.length}`,
		});

		sink.write(dataEvent(1));
		sink.write(dataEvent(2));
		sink.write(dataEvent(3));
		await sink.close();

		expect(chunks).toEqual(["count=3"]);
	});

	test("writes nothing before close()", async () => {
		const chunks: string[] = [];
		const sink = new AggregateSink<number>(collectingStream(chunks), {
			formatter: () => "final",
		});

		sink.write(dataEvent(1));

		expect(chunks).toEqual([]);
	});

	test("the snapshot includes scope status and duration", async () => {
		const chunks: string[] = [];
		const sink = new AggregateSink<never>(collectingStream(chunks), {
			formatter: (run) => JSON.stringify(run.scopes.map((s) => s.status)),
		});

		sink.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "suite",
			key: "suite",
		});
		sink.write({
			kind: "scope-end",
			timestamp: 10,
			scopeId: "a",
			status: "ok",
			durationMs: 10,
		});
		await sink.close();

		expect(chunks).toEqual(['["ok"]']);
	});
});
