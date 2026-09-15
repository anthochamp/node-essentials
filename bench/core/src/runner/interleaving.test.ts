import { MemorySink } from "@ac-kit/app-report";
import { beforeEach, describe, expect, it } from "vitest";

import { MeasureData } from "../common/measure-data.js";
import { collectForkUnits } from "./fork-units.js";
import {
	drainConditions,
	registerCase,
	registerCondition,
} from "./registry.js";
import { runForkUnit } from "./runner.js";

const MEASURE_ = "duration";
const BENCH_FILE_ = "/benchmarks/example.bench.ts";

/**
 * Registers `titles`, each taking `batches` turns and recording who ran when.
 *
 * Stands in for the sampler: a real case yields at every batch boundary, so the
 * order recorded here is the order slices were actually measured in.
 */
function registerInterleaved_(
	batches: Readonly<Record<string, number>>,
	order: string[],
): void {
	registerCondition(MEASURE_, "condition", () => {
		for (const [title, count] of Object.entries(batches)) {
			registerCase(MEASURE_, title, async (context) => {
				for (let batch = 0; batch < count; batch++) {
					order.push(title);

					// Between batches only, as a real measure does: a case that is
					// finished should not take a turn to say so.
					if (batch < count - 1) {
						await context.round();
					}
				}

				context.setCaseResult({ batches: count });
			});
		}
	});
}

async function run_(
	rounds: number,
	order: string[],
): Promise<MemorySink<MeasureData>> {
	const sink = new MemorySink<MeasureData>();
	const [unit] = collectForkUnits(drainConditions());

	await runForkUnit(unit!, new AbortController().signal, {
		sink,
		file: BENCH_FILE_,
		parentScopeId: null,
		rounds,
	});

	void order;

	return sink;
}

describe("round-robin interleaving", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("runs each case to completion when rounds is one", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 3, b: 3 }, order);

		await run_(1, order);

		expect(order).toEqual(["a", "a", "a", "b", "b", "b"]);
	});

	// Without this, the first case measured gets the cold interpreter and the
	// last gets the warm one, and the difference is attributed to the code.
	it("gives every case a slice before any case gets a second", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 3, b: 3, c: 3 }, order);

		await run_(16, order);

		expect(order).toEqual(["a", "b", "c", "a", "b", "c", "a", "b", "c"]);
	});

	it("carries on with the rest when one case finishes early", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 1, b: 3 }, order);

		await run_(16, order);

		expect(order).toEqual(["a", "b", "b", "b"]);
	});

	it("reports how many rounds every case took part in", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 2, b: 5 }, order);

		const sink = new MemorySink<MeasureData>();
		const [unit] = collectForkUnits(drainConditions());

		const outcome = await runForkUnit(unit!, new AbortController().signal, {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
			rounds: 16,
		});

		expect(outcome.pairedRounds).toBe(2);
		expect(outcome.rounds).toBe(5);
		expect(outcome.casesRun).toBe(2);
	});

	it("warns when most rounds ran after some case had stopped", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 1, b: 10 }, order);

		const sink = new MemorySink<MeasureData>();
		const [unit] = collectForkUnits(drainConditions());

		await runForkUnit(unit!, new AbortController().signal, {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
			rounds: 16,
		});

		expect(
			sink.events
				.filter((event) => event.kind === "diagnostic")
				.map((event) => (event.kind === "diagnostic" ? event.code : null)),
		).toContain("paired-window-truncated");
	});

	it("reports no rounds when a single case leaves nothing to interleave", async () => {
		const order: string[] = [];
		registerInterleaved_({ only: 3 }, order);

		const sink = new MemorySink<MeasureData>();
		const [unit] = collectForkUnits(drainConditions());

		const outcome = await runForkUnit(unit!, new AbortController().signal, {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
			rounds: 16,
		});

		expect(outcome.pairedRounds).toBeNull();
		expect(order).toEqual(["only", "only", "only"]);
	});

	it("reports every case's result exactly once", async () => {
		const order: string[] = [];
		registerInterleaved_({ a: 2, b: 4 }, order);

		const sink = await run_(16, order);

		expect(
			sink
				.snapshot()
				.data.filter((data) => data.kind === "case-execution")
				.map((data) => data.caseTitle)
				.toSorted(),
		).toEqual(["a", "b"]);
	});
});
