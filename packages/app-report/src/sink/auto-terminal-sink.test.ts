import type { Terminal } from "@ac-kit/app-terminal";
import { EventDispatcherBase } from "@ac-kit/async";
import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import { autoTerminalSink } from "./auto-terminal-sink.js";

function terminal(overrides?: Partial<Terminal>): Terminal {
	return {
		interactive: true,
		columns: 80,
		rows: 24,
		colorDepth: 4,
		unicode: true,
		hyperlinks: false,
		resize: new EventDispatcherBase(),
		...overrides,
	};
}

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

suite("autoTerminalSink", () => {
	test("uses plainLineFormatter when the terminal is not interactive", async () => {
		const chunks: string[] = [];
		const sink = autoTerminalSink<never>(
			collectingStream(chunks),
			terminal({ interactive: false }),
			{ formatter: () => "custom" },
		);

		await sink.write(scopeStart("a"));

		expect(chunks).toEqual(["> a\n"]);
	});

	test("uses the given formatter through a LiveRegionSink when interactive", async () => {
		const chunks: string[] = [];
		const sink = autoTerminalSink<never>(collectingStream(chunks), terminal(), {
			formatter: () => "custom",
			minRedrawIntervalMs: 0,
		});

		await sink.write(scopeStart("a"));

		expect(chunks.join("")).toContain("custom");
	});
});
