import { expect, suite, test } from "vitest";

import { createNullSink } from "./null-sink.js";

suite("createNullSink", () => {
	test("enabled() is always false", () => {
		const sink = createNullSink<number>();

		expect(sink.enabled?.({ kind: "data" })).toBe(false);
	});

	test("write/flush/close are no-ops and never throw", () => {
		const sink = createNullSink<number>();

		expect(() =>
			sink.write({ kind: "data", timestamp: 0, scopeId: null, data: 1 }),
		).not.toThrow();
		expect(() => sink.flush()).not.toThrow();
		expect(() => sink.close()).not.toThrow();
	});
});
