import { expect, suite, test } from "vitest";

import type { ReportEvent, ReportScopeStatus } from "../events.js";
import { ExitCodeSink } from "./exit-code-sink.js";

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

suite("ExitCodeSink", () => {
	test("status()/exitCode() are ok/0 with no scopes observed", () => {
		const sink = new ExitCodeSink<never>();

		expect(sink.status()).toBe("ok");
		expect(sink.exitCode()).toBe(0);
	});

	test("exitCode() is 0 when every root scope ends ok", () => {
		const sink = new ExitCodeSink<never>();

		sink.write(scopeStart("a"));
		sink.write(scopeEnd("a", "ok"));
		sink.write(scopeStart("b"));
		sink.write(scopeEnd("b", "skipped"));

		expect(sink.status()).toBe("skipped");
		expect(sink.exitCode()).toBe(0);
	});

	test("exitCode() is 1 when a root scope fails", () => {
		const sink = new ExitCodeSink<never>();

		sink.write(scopeStart("a"));
		sink.write(scopeEnd("a", "ok"));
		sink.write(scopeStart("b"));
		sink.write(scopeEnd("b", "failed"));

		expect(sink.status()).toBe("failed");
		expect(sink.exitCode()).toBe(1);
	});

	test("exitCode() is cancelledExitCode when a root scope is cancelled", () => {
		const sink = new ExitCodeSink<never>({ cancelledExitCode: 130 });

		sink.write(scopeStart("a"));
		sink.write(scopeEnd("a", "cancelled"));

		expect(sink.status()).toBe("cancelled");
		expect(sink.exitCode()).toBe(130);
	});

	test("failOn narrows which statuses count as a failure", () => {
		const sink = new ExitCodeSink<never>({ failOn: ["skipped"] });

		sink.write(scopeStart("a"));
		sink.write(scopeEnd("a", "failed"));

		// "failed" is more severe than "skipped" in aggregateScopeStatus, so it
		// still wins the aggregate — but it's not in `failOn`, so it's not
		// treated as a failure for the exit code.
		expect(sink.status()).toBe("failed");
		expect(sink.exitCode()).toBe(0);
	});

	test("only considers root scopes, not nested ones", () => {
		const sink = new ExitCodeSink<never>();

		sink.write(scopeStart("a"));
		sink.write({
			kind: "scope-start",
			timestamp: 0,
			scopeId: "a.child",
			parentId: "a",
			title: "child",
			key: "a.child",
		});
		sink.write({
			kind: "scope-end",
			timestamp: 1,
			scopeId: "a.child",
			status: "failed",
			durationMs: 1,
		});
		sink.write(scopeEnd("a", "ok"));

		expect(sink.status()).toBe("ok");
		expect(sink.exitCode()).toBe(0);
	});

	test("enabled() is always true, flush()/close() are no-ops", () => {
		const sink = new ExitCodeSink<never>();

		expect(sink.enabled({ kind: "data" })).toBe(true);
		expect(sink.flush()).toBeUndefined();
		expect(sink.close()).toBeUndefined();
	});
});
