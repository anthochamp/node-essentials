import { expect, suite, test } from "vitest";

import { jsonLogFormatter } from "./json-log-formatter.js";

suite("jsonLogFormatter", () => {
	test("renders a data event as one JSON line", () => {
		const formatter = jsonLogFormatter();

		const rendered = formatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: { level: "info", message: "hello" },
			},
			undefined as never,
		)!;

		expect(JSON.parse(rendered)).toEqual({
			kind: "data",
			timestamp: 0,
			scopeId: null,
			data: { level: "info", message: "hello" },
		});
	});

	test("runs the error serializer over a LogRecord's own error field", () => {
		const formatter = jsonLogFormatter({
			error: (error) =>
				error instanceof Error ? { message: error.message } : error,
		});

		const rendered = formatter(
			{
				kind: "data",
				timestamp: 0,
				scopeId: null,
				data: {
					level: "error",
					message: "failed",
					error: new Error("boom"),
				},
			},
			undefined as never,
		)!;

		const parsed = JSON.parse(rendered) as { data: { error: unknown } };
		expect(parsed.data.error).toEqual({ message: "boom" });
	});

	test("leaves scope-end's own error handling to serializeReportEvent", () => {
		const formatter = jsonLogFormatter({
			error: () => "redacted",
		});

		const rendered = formatter(
			{
				kind: "scope-end",
				timestamp: 1,
				scopeId: "a",
				status: "failed",
				durationMs: 5,
				error: new Error("boom"),
			},
			undefined as never,
		)!;

		const parsed = JSON.parse(rendered) as { error: unknown };
		expect(parsed.error).toBe("redacted");
	});
});
