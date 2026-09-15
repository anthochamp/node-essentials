import type { Terminal } from "@ac-kit/app-terminal";
import { VoidEvent } from "@ac-kit/async";
import { expect, suite, test, vi } from "vitest";

import type { ReportEvent, ReportScopeStatus } from "../events.js";
import type { Formatter } from "../formatter.js";
import { LiveRegionSink } from "./live-region-sink.js";

function terminal(overrides?: Partial<Terminal>): Terminal {
	return {
		interactive: true,
		columns: 80,
		rows: 24,
		colorDepth: 4,
		unicode: true,
		hyperlinks: false,
		resize: new VoidEvent(),
		...overrides,
	};
}

const formatter: Formatter<unknown> = (event) => {
	switch (event.kind) {
		case "scope-start":
			return `> ${event.title}`;
		case "scope-progress":
			return `> ${event.completed}/${event.total ?? "?"}`;
		case "scope-end":
			return `${event.status}: ${event.scopeId} (${event.durationMs}ms)`;
		case "output":
			return event.chunk;
		case "data":
			return `data: ${JSON.stringify(event.data)}`;
		case "diagnostic":
			return `diagnostic: ${event.message}`;
		default:
			return null;
	}
};

function collectingStream(chunks: string[]): WritableStream<string> {
	return new WritableStream<string>({
		write(chunk) {
			chunks.push(chunk);
		},
	});
}

function scopeStart(id: string): ReportEvent<never> {
	return {
		kind: "scope-start",
		timestamp: 0,
		scopeId: id,
		parentId: null,
		title: id,
		key: id,
	};
}

function scopeEnd(id: string, status: ReportScopeStatus): ReportEvent<never> {
	return {
		kind: "scope-end",
		timestamp: 1,
		scopeId: id,
		status,
		durationMs: 1,
	};
}

function output(scopeId: string, chunk: string): ReportEvent<never> {
	return { kind: "output", timestamp: 0, scopeId, stream: "stdout", chunk };
}

function dataEvent(scopeId: string | null): ReportEvent<never> {
	return { kind: "data", timestamp: 0, scopeId, data: null as never };
}

function diagnosticEvent(scopeId: string | null): ReportEvent<never> {
	return {
		kind: "diagnostic",
		timestamp: 0,
		scopeId,
		severity: "warning",
		message: "high variance",
	};
}

suite("LiveRegionSink", () => {
	test("degrades to plain sequential writes when the terminal is not interactive", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal({ interactive: false }),
		});

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "ok"));

		expect(chunks).toEqual(["> a\n", "ok: a (1ms)\n"]);
		expect(chunks.join("")).not.toContain("\u001B[");
	});

	test("renders the open scope's line into the region", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
		});

		await sink.write(scopeStart("a"));

		expect(chunks.join("")).toContain("> a\n");
	});

	test("moves the cursor up and erases before redrawing a second time", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
		});

		await sink.write(scopeStart("a"));
		chunks.length = 0;

		await sink.write(scopeStart("b"));

		// One line ("> a") was on screen from the previous render.
		expect(chunks[0]?.startsWith("\u001B[1A\u001B[0J")).toBe(true);
	});

	test("flushes a completed scope's line as permanent scrollback", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
		});

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "ok"));

		expect(chunks.join("")).toContain("ok: a (1ms)\n");
	});

	test("does not flush a completed scope's line when showCompleted is false", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
			showCompleted: false,
		});

		await sink.write(scopeStart("a"));
		await sink.write(scopeEnd("a", "ok"));

		expect(chunks.join("")).not.toContain("ok: a");
	});

	test("flushes a data event to scrollback, even with showCompleted false", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
			showCompleted: false,
		});

		await sink.write(dataEvent(null));

		expect(chunks.join("")).toContain("data: null");
	});

	test("flushes a diagnostic event to scrollback, even with showCompleted false", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
			showCompleted: false,
		});

		await sink.write(diagnosticEvent(null));

		expect(chunks.join("")).toContain("diagnostic: high variance");
	});

	test("clamps a multi-line data chunk one physical line at a time, not as a single line", async () => {
		const chunks: string[] = [];
		const multiLineFormatter: Formatter<never> = (event) =>
			event.kind === "data" ? "first line\nsecond line" : null;
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter: multiLineFormatter,
			terminal: terminal({ columns: 10 }),
			minRedrawIntervalMs: 0,
		});

		await sink.write(dataEvent(null));

		const rendered = chunks.join("");
		expect(rendered).toContain("first line");
		// Present in some truncated form — only possible if the second physical
		// line was clamped independently rather than swallowed by clamping the
		// whole two-line chunk as if it were one line.
		expect(rendered).toContain("second");
		expect(rendered).not.toContain("second line");
	});

	test("shows recent output lines for an open scope, bounded by tailLines", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal(),
			minRedrawIntervalMs: 0,
			tailLines: 2,
		});

		await sink.write(scopeStart("a"));
		await sink.write(output("a", "line 1"));
		await sink.write(output("a", "line 2"));
		chunks.length = 0;

		await sink.write(output("a", "line 3"));

		const rendered = chunks.join("");
		expect(rendered).not.toContain("line 1");
		expect(rendered).toContain("line 2");
		expect(rendered).toContain("line 3");
	});

	test("drops the oldest open scopes when they don't all fit terminal.rows", async () => {
		const chunks: string[] = [];
		const sink = new LiveRegionSink<never>(collectingStream(chunks), {
			formatter,
			terminal: terminal({ rows: 3 }),
			minRedrawIntervalMs: 0,
		});

		await sink.write(scopeStart("a"));
		await sink.write(scopeStart("b"));
		chunks.length = 0;

		await sink.write(scopeStart("c"));

		const rendered = chunks.join("");
		expect(rendered).not.toContain("> a");
		expect(rendered).toContain("> b");
		expect(rendered).toContain("> c");
	});

	test("throttles redraws within minRedrawIntervalMs, keeping only the trailing one", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = new LiveRegionSink<never>(collectingStream(chunks), {
				formatter,
				terminal: terminal(),
				minRedrawIntervalMs: 50,
			});

			await sink.write(scopeStart("a"));
			expect(chunks).toHaveLength(1);

			await sink.write(scopeStart("b"));
			await sink.write(scopeStart("c"));
			expect(chunks).toHaveLength(1);

			await vi.advanceTimersByTimeAsync(50);

			expect(chunks).toHaveLength(2);
			expect(chunks[1]).toContain("> c");
		} finally {
			vi.useRealTimers();
		}
	});

	test("resize triggers an immediate redraw, bypassing the throttle", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const resizeDispatcher = new VoidEvent();
			const term = terminal({ resize: resizeDispatcher });
			const sink = new LiveRegionSink<never>(collectingStream(chunks), {
				formatter,
				terminal: term,
				minRedrawIntervalMs: 50,
			});

			await sink.write(scopeStart("a"));
			const before = chunks.length;

			resizeDispatcher.emit();
			await Promise.resolve();

			expect(chunks.length).toBeGreaterThan(before);
		} finally {
			vi.useRealTimers();
		}
	});

	test("flush() forces a pending throttled redraw through immediately", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = new LiveRegionSink<never>(collectingStream(chunks), {
				formatter,
				terminal: terminal(),
				minRedrawIntervalMs: 50,
			});

			await sink.write(scopeStart("a"));
			await sink.write(scopeStart("b"));
			const before = chunks.length;

			await sink.flush();

			expect(chunks.length).toBeGreaterThan(before);
			expect(chunks.join("")).toContain("> b");
		} finally {
			vi.useRealTimers();
		}
	});

	test("close() closes the underlying stream", async () => {
		let closed = false;
		const stream = new WritableStream<string>({
			close() {
				closed = true;
			},
		});
		const sink = new LiveRegionSink<never>(stream, {
			formatter,
			terminal: terminal(),
		});

		await sink.close();

		expect(closed).toBe(true);
	});
});
