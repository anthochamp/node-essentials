import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import {
	MalformedEventError,
	parseReportEvent,
	serializeReportEvent,
} from "./serialize-event.js";

suite("serializeReportEvent", () => {
	test("serializes a plain data event as-is", () => {
		const event: ReportEvent<{ value: number }> = {
			kind: "data",
			timestamp: 1,
			scopeId: null,
			data: { value: 42 },
		};

		expect(serializeReportEvent(event)).toEqual(event);
	});

	test("applies the error transform to a scope-end event's error", () => {
		const event: ReportEvent<never> = {
			kind: "scope-end",
			timestamp: 1,
			scopeId: "a",
			status: "failed",
			durationMs: 1,
			error: new Error("boom"),
		};

		const serialized = serializeReportEvent(event, {
			error: () => "redacted",
		}) as { error: unknown };

		expect(serialized.error).toBe("redacted");
	});

	test("leaves error untouched by default, letting the safe JSON error shape apply", () => {
		const event: ReportEvent<never> = {
			kind: "scope-end",
			timestamp: 1,
			scopeId: "a",
			status: "failed",
			durationMs: 1,
			error: new Error("boom"),
		};

		const serialized = serializeReportEvent(event) as {
			error: { name: string; message: string };
		};

		expect(serialized.error.name).toBe("Error");
		expect(serialized.error.message).toBe("boom");
	});

	test("handles circular references and bigint via @ac-kit/core's safe JSON coercion", () => {
		const circular: { self?: unknown; big: bigint } = { big: 10n };
		circular.self = circular;

		const event: ReportEvent<typeof circular> = {
			kind: "data",
			timestamp: 1,
			scopeId: null,
			data: circular,
		};

		const serialized = serializeReportEvent(event) as {
			data: { self: unknown; big: unknown };
		};

		expect(serialized.data.self).toBe("[Circular]");
		expect(serialized.data.big).toBe(10);
	});

	test("structured-clone mode preserves Uint8Array/BigInt untouched", () => {
		const event: ReportEvent<{ bytes: Uint8Array; big: bigint }> = {
			kind: "data",
			timestamp: 1,
			scopeId: null,
			data: { bytes: new Uint8Array([1, 2, 3]), big: 10n },
		};

		const serialized = serializeReportEvent(event, {
			mode: "structured-clone",
		}) as { data: { bytes: Uint8Array; big: bigint } };

		expect(serialized.data.bytes).toBeInstanceOf(Uint8Array);
		expect(serialized.data.big).toBe(10n);
	});

	test("structured-clone mode still applies the error hook", () => {
		const event: ReportEvent<never> = {
			kind: "scope-end",
			timestamp: 1,
			scopeId: "a",
			status: "failed",
			durationMs: 1,
			error: new Error("boom"),
		};

		const serialized = serializeReportEvent(event, {
			mode: "structured-clone",
			error: () => "redacted",
		}) as { error: unknown };

		expect(serialized.error).toBe("redacted");
	});
});

suite("parseReportEvent", () => {
	const parseData = (data: unknown) => data;

	test("round-trips every event kind through serializeReportEvent", () => {
		const events: ReportEvent<number>[] = [
			{
				kind: "scope-start",
				timestamp: 1,
				scopeId: "a",
				parentId: null,
				title: "suite",
				key: "suite",
				total: 3,
				attributes: { tag: "x" },
			},
			{
				kind: "scope-attributes",
				timestamp: 2,
				scopeId: "a",
				attributes: { tag: "y" },
			},
			{
				kind: "scope-progress",
				timestamp: 3,
				scopeId: "a",
				completed: 1,
				total: 3,
				message: "working",
			},
			{
				kind: "scope-heartbeat",
				timestamp: 4,
				scopeId: "a",
				elapsedMs: 500,
				message: "still going",
			},
			{
				kind: "diagnostic",
				timestamp: 5,
				scopeId: "a",
				severity: "warning",
				code: "high-variance",
				message: "unstable",
				attributes: { unit: "ms" },
			},
			{
				kind: "scope-end",
				timestamp: 6,
				scopeId: "a",
				status: "failed",
				durationMs: 5,
			},
			{
				kind: "output",
				timestamp: 7,
				scopeId: null,
				stream: "stdout",
				chunk: "hello\n",
			},
			{
				kind: "attachment",
				timestamp: 8,
				scopeId: null,
				name: "note.txt",
				mediaType: "text/plain",
				body: "body",
			},
			{ kind: "data", timestamp: 9, scopeId: null, data: 42 },
		];

		for (const event of events) {
			const wire = serializeReportEvent(event);
			expect(parseReportEvent(wire, parseData)).toEqual(event);
		}
	});

	test("throws MalformedEventError for a non-object value", () => {
		expect(() => parseReportEvent("nope", parseData)).toThrow(
			MalformedEventError,
		);
	});

	test("throws MalformedEventError for an unknown kind", () => {
		expect(() =>
			parseReportEvent(
				{ kind: "made-up", timestamp: 1, scopeId: null },
				parseData,
			),
		).toThrow(MalformedEventError);
	});

	test("throws MalformedEventError when a required field is missing", () => {
		expect(() =>
			parseReportEvent(
				{ kind: "scope-end", timestamp: 1, scopeId: "a" },
				parseData,
			),
		).toThrow(MalformedEventError);
	});

	test("throws MalformedEventError when status is not one of the known values", () => {
		expect(() =>
			parseReportEvent(
				{
					kind: "scope-end",
					timestamp: 1,
					scopeId: "a",
					status: "not-a-status",
					durationMs: 1,
				},
				parseData,
			),
		).toThrow(MalformedEventError);
	});

	test("calls parseData with the raw data field of a data event", () => {
		const parsed = parseReportEvent(
			{ kind: "data", timestamp: 1, scopeId: null, data: { value: 1 } },
			(data) => ({ ...(data as { value: number }), doubled: true }),
		);

		expect(parsed).toMatchObject({
			data: { value: 1, doubled: true },
		});
	});
});
