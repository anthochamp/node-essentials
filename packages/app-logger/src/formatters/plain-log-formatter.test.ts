import type { FormatContext, ReportEvent } from "@ac-kit/app-report";
import { ScopeTracker } from "@ac-kit/app-report";
import { expect, suite, test } from "vitest";

import { plainLogFormatter } from "./plain-log-formatter.js";

function context(overrides?: Partial<FormatContext>): FormatContext {
	return { scopes: new ScopeTracker(), ...overrides };
}

suite("plainLogFormatter", () => {
	test("renders level and message as one line", () => {
		const rendered = plainLogFormatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: { level: "info", message: "hello" },
			},
			context(),
		);

		expect(rendered).toBe("[INFO] hello");
	});

	test("renders attributes, error and stack trace as extra indented lines", () => {
		const rendered = plainLogFormatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: {
					level: "error",
					message: "failed",
					attributes: { code: 42 },
					error: new Error("boom"),
					stackTrace: ["at a (a.ts:1:1)"],
				},
			},
			context(),
		);

		expect(rendered).toContain("[ERROR] failed");
		expect(rendered).toContain("attributes: { code: 42 }");
		expect(rendered).toContain("error:");
		expect(rendered).toContain("at a (a.ts:1:1)");
	});

	test("delegates non-data events to plainLineFormatter", () => {
		const scopeStart: ReportEvent<unknown> = {
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a",
			parentId: null,
			title: "build",
			key: "build",
		};
		const scopes = new ScopeTracker();
		scopes.observe(scopeStart);

		const rendered = plainLogFormatter(scopeStart, context({ scopes }));

		expect(rendered).toBe("> build");
	});
});
