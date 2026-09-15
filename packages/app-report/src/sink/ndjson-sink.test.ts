import { expect, suite, test } from "vitest";

import { ScopeTracker } from "../util/scope-tracker.js";
import { ndjsonFormatter } from "./ndjson-sink.js";

suite("ndjsonFormatter", () => {
	test("should render one JSON object per event", () => {
		const formatter = ndjsonFormatter<number>();

		const line = formatter(
			{ kind: "data", data: 1, timestamp: 0, scopeId: null },
			{ scopes: new ScopeTracker() },
		);

		if (line === null) {
			throw new Error("expected a rendered line");
		}
		expect(JSON.parse(line)).toEqual({
			kind: "data",
			data: 1,
			timestamp: 0,
			scopeId: null,
		});
	});

	test("should apply the error transform to scope-end events", () => {
		const formatter = ndjsonFormatter<number>({
			error: () => "redacted",
		});

		const line = formatter(
			{
				kind: "scope-end",
				status: "failed",
				durationMs: 1,
				error: new Error("boom"),
				timestamp: 0,
				scopeId: "1",
			},
			{ scopes: new ScopeTracker() },
		);

		if (line === null) {
			throw new Error("expected a rendered line");
		}
		expect(JSON.parse(line)).toMatchObject({ error: "redacted" });
	});
});
