import type { FormatContext } from "@ac-kit/app-report";
import { ScopeTracker } from "@ac-kit/app-report";
import type { Terminal } from "@ac-kit/app-terminal";
import { VoidEvent } from "@ac-kit/async";
import { expect, suite, test } from "vitest";

import { ansiLogFormatter } from "./ansi-log-formatter.js";

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

function context(overrides?: Partial<FormatContext>): FormatContext {
	return { scopes: new ScopeTracker(), ...overrides };
}

suite("ansiLogFormatter", () => {
	test("wraps the level label in ANSI escape codes", () => {
		const rendered = ansiLogFormatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: { level: "error", message: "failed" },
			},
			context({ terminal: terminal() }),
		)!;

		expect(rendered).toContain("\u001B[");
		expect(rendered).toContain("failed");
	});

	test("defaults to truecolor when no terminal is given", () => {
		const rendered = ansiLogFormatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: { level: "info", message: "hello" },
			},
			context(),
		)!;

		expect(rendered).toContain("38;2;");
	});

	test("delegates non-data events to plainLineFormatter", () => {
		const scopes = new ScopeTracker();
		scopes.observe({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "build",
			key: "build",
		});

		const rendered = ansiLogFormatter(
			{
				kind: "scope-end",
				timestamp: 1,
				scopeId: "a",
				status: "ok",
				durationMs: 5,
			},
			context({ scopes }),
		);

		expect(rendered).toContain("(5ms)");
	});
});
