import { fileURLToPath } from "node:url";

import {
	defineMeasurePlugin,
	MeasureRegistry,
	MeasureScheduling,
} from "@ac-bench/core/plugin";
import { MeasureData } from "@ac-bench/core/runner";
import { MemorySink } from "@ac-kit/app-report";
import type { FieldDescriptor } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import { runFileIsolated } from "./isolated-runner.js";
import { MeasurementPlan } from "./measurement-plan.js";

const FAKE_FIELDS: readonly FieldDescriptor[] = [
	{ name: "value", kind: "quantitative" },
	{ name: "lower", kind: "quantitative" },
	{ name: "upper", kind: "quantitative" },
];

const NESTED = fileURLToPath(
	new URL("./__fixtures__/nested-conditions.bench.ts", import.meta.url),
);

/** The cheapest plan that runs at all; overrides pin whatever a test is about. */
function plan_(overrides: Partial<MeasurementPlan> = {}): MeasurementPlan {
	return {
		replicates: overrides.replicates ?? 1,
		// No escalation headroom unless a test asks for it.
		maxReplicates: overrides.replicates ?? 1,
		isolatedRuns: 0,
		rounds: 1,
		cooldown: false,
		retryOnInstability: 0,
		...overrides,
	};
}

function registry_(
	scheduling?: MeasureScheduling,
	comparison?: { uncertainty: number },
): MeasureRegistry {
	const registry = new MeasureRegistry();
	registry.register(
		defineMeasurePlugin({
			id: "fake",
			label: "Fake",
			parseCaseResult: (value) => value,
			parseConditionResult: (value) => value,
			fields: FAKE_FIELDS,
			caseRow: () => ["ok", null, null],

			...(comparison === undefined
				? {}
				: {
						comparison: {
							field: "value",
							interval: ["lower", "upper"],
						},
					}),

			// Two cases one unit apart: whether they can be told apart is entirely
			// a matter of the interval the test asks for.
			deriveFields: (frame) =>
				dataFrameFromRows(
					FAKE_FIELDS,
					Array.from({ length: frame.rowCount }, (_unused, index) =>
						comparison === undefined
							? [index, null, null]
							: [
									index,
									index - comparison.uncertainty,
									index + comparison.uncertainty,
								],
					),
				),
			warnings: () => [],
			pool: (executions) => executions[0]!.result,
			scheduling: scheduling ?? { rounds: "many", grouping: "condition" },
			toJsonCase: (value) => value,
			toJsonCondition: (value) => value,
		}),
	);

	return registry;
}

/** One entry per case result reported, in the order the parent received them. */
function caseTitles_(sink: MemorySink<MeasureData>): string[] {
	return sink
		.snapshot()
		.data.filter((entry) => entry.kind === "case-execution")
		.map((entry) => entry.caseTitle);
}

/** How many children ran: one scope per fork, tagged with the arm it served. */
function forkCount_(sink: MemorySink<MeasureData>): number {
	return sink.events.filter(
		(event) =>
			event.kind === "scope-start" &&
			typeof event.attributes?.["benchArm"] === "string",
	).length;
}

async function run_(
	plan: MeasurementPlan,
	orderSeed: number,
): Promise<MemorySink<MeasureData>> {
	return runWith_(registry_(), plan, orderSeed);
}

async function runWith_(
	registry: MeasureRegistry,
	plan: MeasurementPlan,
	orderSeed = 1,
): Promise<MemorySink<MeasureData>> {
	const sink = new MemorySink<MeasureData>();

	await runFileIsolated(NESTED, {
		sink,
		registry,
		signal: AbortSignal.timeout(120_000),
		runId: "plan-test",
		artifactCacheRoot: "/tmp/ac-bench-test",
		plan,
		orderSeed,
	});

	return sink;
}

describe("the measurement plan", () => {
	// The fixture nests `bar` inside `foo`, so there is one fork unit —
	// `foo > bar` — running `bar`'s own case and the one it inherits from `foo`.
	it("runs one process per fork unit when the plan asks for one", async () => {
		const sink = await run_(plan_(), 1);

		expect(forkCount_(sink)).toBe(1);
		expect(caseTitles_(sink).toSorted()).toEqual(["dux", "fax"]);
	}, 120_000);

	it("runs P independent processes per fork unit", async () => {
		const plan = plan_({ replicates: 3 });
		const sink = await run_(plan, 1);

		expect(forkCount_(sink)).toBe(3);
		expect(caseTitles_(sink)).toHaveLength(6);
	}, 120_000);

	/**
	 * One shared execution of the pair, plus `Q` executions of each case alone:
	 * the only way to tell "this case is slow" from "this case is slow after the
	 * other one".
	 */
	it("adds Q single-case processes for each case of a multi-case condition", async () => {
		const plan = plan_({
			replicates: 1,
			isolatedRuns: 2,
		});
		const sink = await run_(plan, 1);

		expect(forkCount_(sink)).toBe(1 + 2 * 2);
	}, 120_000);

	it("reproduces an ordering from a seed and varies it otherwise", async () => {
		const plan = plan_({ replicates: 4 });

		const first = caseTitles_(await run_(plan, 7));
		const same = caseTitles_(await run_(plan, 7));

		expect(same).toEqual(first);
		expect(first.toSorted()).toEqual(
			caseTitles_(await run_(plan, 8)).toSorted(),
		);
	}, 120_000);

	// This plugin reports no uncertainty at all, so no comparison is ever open
	// and there is never a reason to spend another process.
	it("does not escalate a comparison nothing says is unsettled", async () => {
		const plan = plan_({
			replicates: 1,
			maxReplicates: 5,
		});

		expect(forkCount_(await run_(plan, 1))).toBe(1);
	}, 120_000);

	it("adds processes while the intervals leave the ranking open", async () => {
		const sink = await runWith_(
			registry_(undefined, { uncertainty: 100 }),
			plan_({ replicates: 1, maxReplicates: 4 }),
		);

		expect(forkCount_(sink)).toBe(4);
	}, 120_000);

	it("stops escalating once the intervals separate", async () => {
		const sink = await runWith_(
			registry_(undefined, { uncertainty: 0.001 }),
			plan_({ replicates: 1, maxReplicates: 4 }),
		);

		expect(forkCount_(sink)).toBe(1);
	}, 120_000);
});
