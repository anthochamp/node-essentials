import { fileURLToPath } from "node:url";

import {
	defineMeasurePlugin,
	MeasureRegistry,
	MeasureScheduling,
} from "@ac-bench/core/plugin";
import { MeasureData } from "@ac-bench/core/runner";
import { MemorySink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import { EnvironmentMonitor } from "./environment-monitor.js";
import {
	IsolatedRunOptions,
	resolveConditionRounds,
	runFileIsolated,
} from "./isolated-runner.js";

const NESTED = fixture_("nested-conditions.bench.ts");
const EXPOSE_GC = fixture_("expose-gc.bench.ts");

function fixture_(name: string): string {
	return fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
}

function registryWith_(scheduling: MeasureScheduling): MeasureRegistry {
	const registry = new MeasureRegistry();

	registry.register(
		defineMeasurePlugin({
			id: "fake",
			label: "Fake",
			parseCaseResult: (value) => value,
			parseConditionResult: (value) => value,
			fields: [{ name: "value", kind: "nominal" }],
			caseRow: () => ["ok"],
			warnings: () => [],
			pool: (executions) => executions[0]!.result,
			scheduling,
			toJsonCase: (value) => value,
			toJsonCondition: (value) => value,
		}),
	);

	return registry;
}

function runOptions_(
	sink: MemorySink<MeasureData>,
	registry: MeasureRegistry,
): IsolatedRunOptions {
	return {
		sink,
		registry,
		signal: AbortSignal.timeout(60_000),
		runId: "test-run",
		artifactCacheRoot: "/tmp/ac-bench-test",
	};
}

/** Titles of every condition scope opened by a child, one per fork. */
function forkedConditionScopes_(sink: MemorySink<MeasureData>): string[] {
	return sink.events
		.filter(
			(event) =>
				event.kind === "scope-start" &&
				typeof event.attributes?.["benchArm"] === "string",
		)
		.map((event) => (event.kind === "scope-start" ? event.title : ""));
}

/** A monitor whose machine oscillates across the contention threshold. */
function unstableMonitor_(): EnvironmentMonitor {
	let index = 0;

	return new EnvironmentMonitor(
		() =>
			Promise.resolve({
				at: index * 1000,
				loadRatio: index++ % 2 === 0 ? 0.4 : 0.95,
				frequencyRatio: null,
				temperatureC: null,
				parentCpuRatio: 0.01,
				childRssBytes: null,
			}),
		{ intervalMs: 0 },
	);
}

function attemptTitles_(sink: MemorySink<MeasureData>): string[] {
	return sink.events
		.filter(
			(event) =>
				event.kind === "scope-start" && event.title.includes("attempt"),
		)
		.map((event) => (event.kind === "scope-start" ? event.title : ""));
}

function attemptStatuses_(sink: MemorySink<MeasureData>): string[] {
	const attempts = new Set(
		sink.events
			.filter(
				(event) =>
					event.kind === "scope-start" &&
					event.title.includes("attempt") &&
					event.scopeId !== null,
			)
			.map((event) => (event.kind === "scope-start" ? event.scopeId : null)),
	);

	return sink.events
		.filter(
			(event) => event.kind === "scope-end" && attempts.has(event.scopeId),
		)
		.map((event) => (event.kind === "scope-end" ? event.status : ""));
}

function diagnosticCodes_(
	sink: MemorySink<MeasureData>,
): (string | undefined)[] {
	return sink.events
		.filter((event) => event.kind === "diagnostic")
		.map((event) => (event.kind === "diagnostic" ? event.code : undefined));
}

describe("resolveConditionRounds", () => {
	it("should clamp a measure that refuses interleaving to one round", () => {
		expect(
			resolveConditionRounds({ rounds: "one", grouping: "condition" }, 4),
		).toBe(1);
	});

	it("should honour the requested rounds when the measure allows many", () => {
		expect(
			resolveConditionRounds({ rounds: "many", grouping: "condition" }, 4),
		).toBe(4);
	});

	it("should default to a single round when nothing was requested", () => {
		expect(
			resolveConditionRounds(
				{ rounds: "many", grouping: "condition" },
				undefined,
			),
		).toBe(1);
	});
});

/** What the children measured, one entry per case per fork. */
function executionTitles_(sink: MemorySink<MeasureData>): string[] {
	return sink
		.snapshot()
		.data.filter((data) => data.kind === "case-execution")
		.map((data) => data.caseTitle);
}

/** What the parent concluded, one entry per case. */
function pooledResults_(sink: MemorySink<MeasureData>): unknown[] {
	return sink
		.snapshot()
		.data.filter((data) => data.kind === "case-result")
		.map((data) => data.result);
}

describe("runFileIsolated", () => {
	it("should fork once per condition when the measure groups by condition", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(
			NESTED,
			runOptions_(
				sink,
				registryWith_({ rounds: "many", grouping: "condition" }),
			),
		);

		expect(forkedConditionScopes_(sink)).toEqual(["foo > bar"]);
		expect(executionTitles_(sink).toSorted()).toEqual(["dux", "fax"]);
		expect(pooledResults_(sink)).toHaveLength(2);
	});

	it("should fork once per case when the measure groups by case", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(
			NESTED,
			runOptions_(sink, registryWith_({ rounds: "many", grouping: "case" })),
		);

		expect(forkedConditionScopes_(sink)).toEqual(["foo > bar", "foo > bar"]);
		// Which case goes first is randomised, so only the set is fixed here.
		expect(executionTitles_(sink).toSorted()).toEqual(["dux", "fax"]);
	});

	it("should fork the child with the measure's declared execArgv", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(
			EXPOSE_GC,
			runOptions_(
				sink,
				registryWith_({
					rounds: "many",
					grouping: "condition",
					execArgv: ["--expose-gc"],
				}),
			),
		);

		expect(pooledResults_(sink)).toEqual([{ hasGc: true }]);
	});

	it("should not expose gc when the measure declares no execArgv", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(
			EXPOSE_GC,
			runOptions_(
				sink,
				registryWith_({ rounds: "many", grouping: "condition" }),
			),
		);

		expect(pooledResults_(sink)).toEqual([{ hasGc: false }]);
	});

	it("should report the measuring child's pid while it runs", async () => {
		const sink = new MemorySink<MeasureData>();
		const observed: (number | undefined)[] = [];

		await runFileIsolated(EXPOSE_GC, {
			...runOptions_(
				sink,
				registryWith_({ rounds: "many", grouping: "condition" }),
			),
			onChildPid: (pid) => observed.push(pid),
		});

		expect(observed.filter((pid) => typeof pid === "number")).not.toEqual([]);
		expect(observed.at(-1)).toBeUndefined();
	});

	it("should keep both attempts when an unstable machine forces a retry", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(EXPOSE_GC, {
			...runOptions_(
				sink,
				registryWith_({ rounds: "many", grouping: "condition" }),
			),
			monitor: unstableMonitor_(),
			retryOnInstability: 1,
		});

		expect(attemptTitles_(sink)).toEqual(["gc (attempt 1)", "gc (attempt 2)"]);

		// Never one silently-chosen result: the discarded attempt says so.
		expect(attemptStatuses_(sink)).toEqual(["skipped", "ok"]);
		expect(diagnosticCodes_(sink)).toContain("unstable-environment");
	});

	it("should not retry a condition measured on a quiet machine", async () => {
		const sink = new MemorySink<MeasureData>();

		await runFileIsolated(EXPOSE_GC, {
			...runOptions_(
				sink,
				registryWith_({ rounds: "many", grouping: "condition" }),
			),
			retryOnInstability: 1,
		});

		expect(attemptTitles_(sink)).toEqual(["gc (attempt 1)"]);
		expect(diagnosticCodes_(sink)).not.toContain("unstable-environment");
	});
});
