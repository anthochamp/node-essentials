import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import { MemorySink } from "./memory-sink.js";

suite("MemorySink", () => {
	test("retains every event in write order", () => {
		const sink = new MemorySink<number>();
		const events: ReportEvent<number>[] = [
			{ kind: "data", timestamp: 1, scopeId: null, data: 1 },
			{ kind: "data", timestamp: 2, scopeId: null, data: 2 },
		];

		for (const event of events) {
			sink.write(event);
		}

		expect(sink.events).toEqual(events);
	});

	test("snapshot collects data and attachments, and tracks scopes", () => {
		const sink = new MemorySink<number>();

		sink.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		sink.write({ kind: "data", timestamp: 1, scopeId: "a", data: 42 });
		sink.write({
			kind: "attachment",
			timestamp: 2,
			scopeId: "a",
			mediaType: "text/plain",
			body: "hello",
		});
		sink.write({
			kind: "scope-end",
			timestamp: 5,
			scopeId: "a",
			status: "ok",
			durationMs: 5,
		});

		const snapshot = sink.snapshot();

		expect(snapshot.startedAt).toBe(0);
		expect(snapshot.endedAt).toBe(5);
		expect(snapshot.status).toBe("ok");
		expect(snapshot.data).toEqual([42]);
		expect(snapshot.attachments).toEqual([
			{
				name: undefined,
				mediaType: "text/plain",
				body: "hello",
			},
		]);
		expect(snapshot.scopes.map((record) => record.id)).toEqual(["a"]);
	});

	test("snapshot status is the most severe root scope status", () => {
		const sink = new MemorySink<never>();

		sink.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "a",
			key: "a",
		});
		sink.write({
			kind: "scope-end",
			timestamp: 1,
			scopeId: "a",
			status: "failed",
			durationMs: 1,
		});

		expect(sink.snapshot().status).toBe("failed");
	});

	test("clear() discards every retained event", () => {
		const sink = new MemorySink<number>();
		sink.write({ kind: "data", timestamp: 1, scopeId: null, data: 1 });
		sink.clear();

		expect(sink.events).toEqual([]);
		expect(sink.snapshot()).toEqual({
			startedAt: 0,
			endedAt: 0,
			status: "ok",
			scopes: [],
			data: [],
			attachments: [],
		});
	});
});
