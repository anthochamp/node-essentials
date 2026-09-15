import { expect, suite, test } from "vitest";

import type { Attributes } from "../attributes.js";
import type { ReportEvent } from "../events.js";
import { ScopeTracker, UnknownScopeError } from "./scope-tracker.js";

function scopeStart(
	id: string,
	parentId: string | null,
	options?: { total?: number; attributes?: Attributes },
): ReportEvent<never> {
	return {
		kind: "scope-start",
		timestamp: 0,
		scopeId: id,
		parentId,
		title: id,
		key: id,
		total: options?.total,
		attributes: options?.attributes,
	};
}

suite("ScopeTracker", () => {
	test("registers a scope on scope-start", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));

		const record = tracker.get("a");
		expect(record?.id).toBe("a");
		expect(record?.status).toBeNull();
		expect(record?.completed).toBe(0);
	});

	test("tracks roots and children", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));
		tracker.observe(scopeStart("b", "a"));
		tracker.observe(scopeStart("c", "a"));
		tracker.observe(scopeStart("d", null));

		expect(tracker.roots().map((record) => record.id)).toEqual(["a", "d"]);
		expect(tracker.all().map((record) => record.id)).toEqual([
			"a",
			"b",
			"c",
			"d",
		]);
		expect(tracker.children("a").map((record) => record.id)).toEqual([
			"b",
			"c",
		]);
		expect(tracker.children("b")).toEqual([]);
	});

	test("path returns the chain from root to the given scope, inclusive", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));
		tracker.observe(scopeStart("b", "a"));
		tracker.observe(scopeStart("c", "b"));

		expect(tracker.path("c").map((record) => record.id)).toEqual([
			"a",
			"b",
			"c",
		]);
		expect(tracker.depth("c")).toBe(2);
		expect(tracker.depth("a")).toBe(0);
	});

	test("scope-progress updates completed/total/message", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null, { total: 10 }));
		tracker.observe({
			kind: "scope-progress",
			timestamp: 1,
			scopeId: "a",
			completed: 3,
			message: "working",
		});

		const record = tracker.get("a");
		expect(record?.completed).toBe(3);
		expect(record?.total).toBe(10);
		expect(record?.progressMessage).toBe("working");
	});

	test("scope-heartbeat sets lastHeartbeatAt/heartbeatMessage without touching completed", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));
		tracker.observe({
			kind: "scope-progress",
			timestamp: 1,
			scopeId: "a",
			completed: 7,
		});
		tracker.observe({
			kind: "scope-heartbeat",
			timestamp: 2,
			scopeId: "a",
			elapsedMs: 200,
			message: "still going",
		});

		const record = tracker.get("a");
		expect(record?.completed).toBe(7);
		expect(record?.lastHeartbeatAt).toBe(2);
		expect(record?.heartbeatMessage).toBe("still going");
	});

	test("scope-end sets status/durationMs and closes the scope", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));
		expect(tracker.open().map((record) => record.id)).toEqual(["a"]);

		tracker.observe({
			kind: "scope-end",
			timestamp: 5,
			scopeId: "a",
			status: "failed",
			durationMs: 5,
			error: new Error("boom"),
		});

		const record = tracker.get("a");
		expect(record?.status).toBe("failed");
		expect(record?.durationMs).toBe(5);
		expect(record?.error).toBeInstanceOf(Error);
		expect(tracker.open()).toEqual([]);
	});

	test("scope-attributes merges into the existing attribute set", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null, { attributes: { one: 1 } }));
		tracker.observe({
			kind: "scope-attributes",
			timestamp: 1,
			scopeId: "a",
			attributes: { two: 2 },
		});

		expect(tracker.get("a")?.attributes).toEqual({ one: 1, two: 2 });
	});

	test("throws UnknownScopeError for an event referencing an undeclared scope", () => {
		const tracker = new ScopeTracker();

		expect(() =>
			tracker.observe({
				kind: "scope-progress",
				timestamp: 0,
				scopeId: "missing",
				completed: 1,
			}),
		).toThrow(UnknownScopeError);
	});

	test("output/attachment/data events are no-ops for the tracker", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));

		tracker.observe({
			kind: "output",
			timestamp: 1,
			scopeId: "a",
			stream: "stdout",
			chunk: "hello\n",
		});
		tracker.observe({
			kind: "data",
			timestamp: 1,
			scopeId: "a",
			data: 42,
		});

		expect(tracker.get("a")?.completed).toBe(0);
	});

	test("diagnostic events append to the scope's diagnostics, in order", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));
		tracker.observe({
			kind: "diagnostic",
			timestamp: 1,
			scopeId: "a",
			severity: "warning",
			code: "high-variance",
			message: "first",
		});
		tracker.observe({
			kind: "diagnostic",
			timestamp: 2,
			scopeId: "a",
			severity: "error",
			message: "second",
		});

		expect(tracker.get("a")?.diagnostics).toEqual([
			{
				severity: "warning",
				code: "high-variance",
				message: "first",
				attributes: undefined,
			},
			{
				severity: "error",
				code: undefined,
				message: "second",
				attributes: undefined,
			},
		]);
	});

	test("a root-level diagnostic (null scopeId) is not attached to any scope", () => {
		const tracker = new ScopeTracker();
		tracker.observe(scopeStart("a", null));

		expect(() =>
			tracker.observe({
				kind: "diagnostic",
				timestamp: 1,
				scopeId: null,
				severity: "info",
				message: "root diagnostic",
			}),
		).not.toThrow();
		expect(tracker.get("a")?.diagnostics).toEqual([]);
	});
});
