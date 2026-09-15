import { expect, suite, test } from "vitest";

import type { ReportEvent } from "../events.js";
import { ScopeTracker } from "../util/scope-tracker.js";
import { plainLineFormatter } from "./plain-line-sink.js";

function context(scopes: ScopeTracker) {
	return { scopes };
}

suite("plainLineFormatter", () => {
	test("should render a scope-start line", () => {
		const scopes = new ScopeTracker();
		const event: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: null,
			title: "suite",
			key: "suite",
			timestamp: 0,
			scopeId: "1",
		};
		scopes.observe(event);

		expect(plainLineFormatter(event, context(scopes))).toBe("> suite");
	});

	test("should indent nested scopes", () => {
		const scopes = new ScopeTracker();
		const root: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: null,
			title: "suite",
			key: "suite",
			timestamp: 0,
			scopeId: "1",
		};
		const child: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: "1",
			title: "case",
			key: "suite/case",
			timestamp: 0,
			scopeId: "2",
		};
		scopes.observe(root);
		scopes.observe(child);

		expect(plainLineFormatter(child, context(scopes))).toBe("  > case");
	});

	test("should render a scope-end line with its status label and duration", () => {
		const scopes = new ScopeTracker();
		const start: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: null,
			title: "suite",
			key: "suite",
			timestamp: 0,
			scopeId: "1",
		};
		const end: ReportEvent<unknown> = {
			kind: "scope-end",
			status: "failed",
			durationMs: 12,
			timestamp: 12,
			scopeId: "1",
		};
		scopes.observe(start);
		scopes.observe(end);

		expect(plainLineFormatter(end, context(scopes))).toBe(
			"[FAIL] suite (12ms)",
		);
	});

	test("should pass output chunks through unchanged", () => {
		const scopes = new ScopeTracker();
		const event: ReportEvent<unknown> = {
			kind: "output",
			stream: "stdout",
			chunk: "hello",
			timestamp: 0,
			scopeId: null,
		};

		expect(plainLineFormatter(event, context(scopes))).toBe("hello");
	});

	test("should render an attachment line", () => {
		const scopes = new ScopeTracker();
		const event: ReportEvent<unknown> = {
			kind: "attachment",
			name: "screenshot.png",
			mediaType: "image/png",
			body: new Uint8Array(),
			timestamp: 0,
			scopeId: null,
		};

		expect(plainLineFormatter(event, context(scopes))).toBe(
			"[attachment] screenshot.png (image/png)",
		);
	});

	test("should render a diagnostic line, indented under its scope", () => {
		const scopes = new ScopeTracker();
		const root: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: null,
			title: "suite",
			key: "suite",
			timestamp: 0,
			scopeId: "1",
		};
		const child: ReportEvent<unknown> = {
			kind: "scope-start",
			parentId: "1",
			title: "case",
			key: "suite/case",
			timestamp: 0,
			scopeId: "2",
		};
		scopes.observe(root);
		scopes.observe(child);

		expect(
			plainLineFormatter(
				{
					kind: "diagnostic",
					timestamp: 0,
					scopeId: "2",
					severity: "warning",
					message: "high variance",
				},
				context(scopes),
			),
		).toBe("  [WARN] high variance");
	});

	test("should render a root-level diagnostic line with no indentation", () => {
		const scopes = new ScopeTracker();

		expect(
			plainLineFormatter(
				{
					kind: "diagnostic",
					timestamp: 0,
					scopeId: null,
					severity: "error",
					message: "load failed",
				},
				context(scopes),
			),
		).toBe("[ERROR] load failed");
	});

	test("should render nothing for scope-progress, scope-attributes, scope-heartbeat and data", () => {
		const scopes = new ScopeTracker();

		expect(
			plainLineFormatter(
				{
					kind: "scope-progress",
					completed: 1,
					timestamp: 0,
					scopeId: "1",
				},
				context(scopes),
			),
		).toBeNull();

		expect(
			plainLineFormatter(
				{
					kind: "scope-attributes",
					attributes: {},
					timestamp: 0,
					scopeId: "1",
				},
				context(scopes),
			),
		).toBeNull();

		expect(
			plainLineFormatter(
				{
					kind: "scope-heartbeat",
					timestamp: 0,
					scopeId: "1",
				},
				context(scopes),
			),
		).toBeNull();

		expect(
			plainLineFormatter(
				{ kind: "data", data: 1, timestamp: 0, scopeId: null },
				context(scopes),
			),
		).toBeNull();
	});
});
