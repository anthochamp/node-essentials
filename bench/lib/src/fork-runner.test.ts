import { fileURLToPath } from "node:url";

import { MeasureData, StartMessage } from "@ac-bench/core/runner";
import { MemorySink, ReportDiagnostic } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import {
	ChildExitedError,
	discoverConditionsInFile,
	runForkUnitInChild,
} from "./fork-runner.js";

const NESTED = fixture_("nested-conditions.bench.ts");
const CRASHING = fixture_("crashing-condition.bench.ts");
const BROKEN = fixture_("broken-condition.bench.ts");
const SETUP_MARKER = fixture_("setup-marker.bench.ts");
const SETUP_FILE = fixture_("setup-file.ts");
const SLOW = fixture_("slow-condition.bench.ts");

function fixture_(name: string): string {
	return fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));
}

function forkOptions_(signal: AbortSignal) {
	return {
		runId: "test-run",
		artifactCacheRoot: "/tmp/ac-bench-test",
		signal,
		heartbeatTimeoutMs: 30_000,
	};
}

function start_(overrides: Partial<StartMessage>): Omit<StartMessage, "t"> {
	return {
		file: NESTED,
		conditionPath: [0, 0],
		conditionTitles: ["foo", "bar"],
		parentScopeId: null,
		arm: "shared",
		replicate: 0,
		rounds: 1,
		orderSeed: 0,
		emitSamples: false,
		...overrides,
	};
}

/** Every scope-start title paired with the status its scope-end reported. */
function closedScopes_(sink: MemorySink<MeasureData>): [string, string][] {
	const titles = new Map<string, string>();
	const closed: [string, string][] = [];

	for (const event of sink.events) {
		if (event.kind === "scope-start" && event.scopeId !== null) {
			titles.set(event.scopeId, event.title);
		}

		if (event.kind === "scope-end" && event.scopeId !== null) {
			closed.push([titles.get(event.scopeId) ?? "?", event.status]);
		}
	}

	return closed;
}

describe("discoverConditionsInFile", () => {
	it("should return the nested tree without running a case", async () => {
		const conditions = await discoverConditionsInFile(
			NESTED,
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(conditions).toEqual([
			{
				title: "foo",
				measure: "fake",
				entries: [
					{
						kind: "condition",
						condition: {
							title: "bar",
							measure: "fake",
							entries: [{ kind: "case", title: "dux" }],
						},
					},
					{ kind: "case", title: "fax" },
				],
			},
		]);
	});

	it("should reject when the bench file cannot be loaded", async () => {
		await expect(
			discoverConditionsInFile(
				BROKEN,
				forkOptions_(AbortSignal.timeout(60_000)),
			),
		).rejects.toThrow(Error);
	});
});

describe("runForkUnitInChild", () => {
	it("should replay the leaf's scopes and its inherited results in order", async () => {
		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnitInChild(
			start_({}),
			sink,
			() => {},
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(outcome).toEqual({ status: "ok", error: null });
		expect(closedScopes_(sink)).toEqual([
			["dux", "ok"],
			["fax", "ok"],
			["foo > bar", "ok"],
		]);
		expect(sink.snapshot().data).toEqual([
			{
				kind: "case-execution",
				measure: "fake",
				caseTitle: "dux",
				arm: "shared",
				replicate: 0,
				result: { value: 1 },
			},
			{
				kind: "case-execution",
				measure: "fake",
				caseTitle: "fax",
				arm: "shared",
				replicate: 0,
				result: { value: 2 },
			},
		]);
	});

	it("should run only the cases named by caseFilter", async () => {
		const sink = new MemorySink<MeasureData>();

		await runForkUnitInChild(
			start_({ caseFilter: ["fax"] }),
			sink,
			() => {},
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(sink.snapshot().data).toEqual([
			{
				kind: "case-execution",
				measure: "fake",
				caseTitle: "fax",
				arm: "shared",
				replicate: 0,
				result: { value: 2 },
			},
		]);
	});

	it("should hang the child's condition scope under the parent-owned scope", async () => {
		const sink = new MemorySink<MeasureData>();

		await runForkUnitInChild(
			start_({ parentScopeId: "ancestor" }),
			sink,
			() => {},
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		const conditionStart = sink.events.find(
			(event) => event.kind === "scope-start" && event.title === "foo > bar",
		);

		expect(conditionStart).toMatchObject({ parentId: "ancestor" });
	});

	it("should fail the condition when a title changed since discovery", async () => {
		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnitInChild(
			start_({ conditionTitles: ["foo", "renamed"] }),
			sink,
			() => {},
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(outcome.status).toBe("failed");
		expect(outcome.error).toBeInstanceOf(Error);
	});

	it("should close every scope the child left open when it dies mid-case", async () => {
		const sink = new MemorySink<MeasureData>();
		const diagnostics: ReportDiagnostic[] = [];

		const outcome = await runForkUnitInChild(
			start_({
				file: CRASHING,
				conditionPath: [0],
				conditionTitles: ["crashing"],
			}),
			sink,
			(diagnostic) => diagnostics.push(diagnostic),
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(outcome.status).toBe("failed");
		expect(outcome.error).toBeInstanceOf(ChildExitedError);
		expect(outcome.error).toMatchObject({ code: 3 });
		expect(closedScopes_(sink)).toEqual([
			["kills itself", "failed"],
			["crashing", "failed"],
		]);
		expect(sink.snapshot().scopes.filter((s) => s.status === null)).toEqual([]);
	});

	it("should import the configured setup files before the bench file", async () => {
		const sink = new MemorySink<MeasureData>();

		await runForkUnitInChild(
			start_({
				file: SETUP_MARKER,
				conditionPath: [0],
				conditionTitles: ["setup"],
			}),
			sink,
			() => {},
			{
				...forkOptions_(AbortSignal.timeout(60_000)),
				setupFiles: [SETUP_FILE],
			},
		);

		expect(sink.snapshot().data).toEqual([
			{
				kind: "case-execution",
				measure: "fake",
				caseTitle: "reports the marker",
				arm: "shared",
				replicate: 0,
				result: { marker: "set-by-setup-file" },
			},
		]);
	});

	it("should not see the marker when no setup file is configured", async () => {
		const sink = new MemorySink<MeasureData>();

		await runForkUnitInChild(
			start_({
				file: SETUP_MARKER,
				conditionPath: [0],
				conditionTitles: ["setup"],
			}),
			sink,
			() => {},
			forkOptions_(AbortSignal.timeout(60_000)),
		);

		expect(sink.snapshot().data).toEqual([
			{
				kind: "case-execution",
				measure: "fake",
				caseTitle: "reports the marker",
				arm: "shared",
				replicate: 0,
				result: { marker: null },
			},
		]);
	});

	it("should fail the child that cannot load a setup file", async () => {
		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnitInChild(
			start_({
				file: SETUP_MARKER,
				conditionPath: [0],
				conditionTitles: ["setup"],
			}),
			sink,
			() => {},
			{
				...forkOptions_(AbortSignal.timeout(60_000)),
				setupFiles: [fixture_("does-not-exist.ts")],
			},
		);

		expect(outcome.status).toBe("failed");
		expect(sink.snapshot().data).toEqual([]);
	});

	it("should stop a condition that outlives its budget, leaving no scope open", async () => {
		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnitInChild(
			start_({
				file: SLOW,
				conditionPath: [0],
				conditionTitles: ["slow"],
			}),
			sink,
			() => {},
			{
				...forkOptions_(AbortSignal.timeout(60_000)),
				conditionTimeoutMs: 500,
				heartbeatTimeoutMs: 1000,
			},
		);

		expect(outcome.status).toBe("failed");
		expect(outcome.error).toBeInstanceOf(Error);
		expect(sink.snapshot().scopes.filter((s) => s.status === null)).toEqual([]);
	});
});
