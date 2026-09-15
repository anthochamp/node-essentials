import { MemorySink, ReportScopeStatus } from "@ac-kit/app-report";
import { beforeEach, describe, expect, it } from "vitest";

import { MeasureData } from "../common/measure-data.js";
import { collectForkUnits, ForkUnit } from "./fork-units.js";
import {
	drainConditions,
	registerAfterAll,
	registerBeforeAll,
	registerCase,
	registerCondition,
} from "./registry.js";
import { runForkUnit } from "./runner.js";

const MEASURE = "duration";
const BENCH_FILE_ = "/benchmarks/example.bench.ts";

function neverAborted_(): AbortSignal {
	return new AbortController().signal;
}

/** Every closed scope as `[title, status]`, in `scope-end` order. */
function closedScopes_(
	sink: MemorySink<MeasureData>,
): [string, ReportScopeStatus][] {
	const titles = new Map<string, string>();
	const closed: [string, ReportScopeStatus][] = [];

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

/** Drains the registry and returns the fork unit at `index`. */
function forkUnit_(index = 0): ForkUnit {
	const unit = collectForkUnits(drainConditions())[index];

	if (unit === undefined) {
		throw new Error(`no fork unit registered at index ${index}`);
	}

	return unit;
}

async function runUnits_(
	units: readonly ForkUnit[],
	sink: MemorySink<MeasureData>,
): Promise<void> {
	for (const unit of units) {
		await runForkUnit(unit, neverAborted_(), {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
		});
	}
}

describe("runForkUnit", () => {
	beforeEach(() => {
		drainConditions();
	});

	it("should run the enclosing conditions' cases as well as the leaf's own", async () => {
		const ran: string[] = [];

		registerCondition(MEASURE, "outer", () => {
			registerCase(MEASURE, "outer b", () => {
				ran.push("outer b");
			});
			registerCondition(MEASURE, "inner", () => {
				registerCase(MEASURE, "inner a", () => {
					ran.push("inner a");
				});
			});
		});

		await runForkUnit(forkUnit_(), neverAborted_(), {
			sink: new MemorySink<MeasureData>(),
			file: BENCH_FILE_,
			parentScopeId: null,
		});

		expect(ran).toEqual(["outer b", "inner a"]);
	});

	it("should measure the same cases once per sibling leaf", async () => {
		const ran: string[] = [];

		registerCondition(MEASURE, "json", () => {
			registerCase(MEASURE, "parse", () => {
				ran.push("parse");
			});
			registerCondition(MEASURE, "with reviver", () => {});
			registerCondition(MEASURE, "without reviver", () => {});
		});

		await runUnits_(
			collectForkUnits(drainConditions()),
			new MemorySink<MeasureData>(),
		);

		expect(ran).toEqual(["parse", "parse"]);
	});

	it("should run an enclosing condition's beforeAll once per leaf", async () => {
		let beforeAllCalls = 0;

		registerCondition(MEASURE, "outer", () => {
			registerBeforeAll(() => {
				beforeAllCalls += 1;
			});
			registerCase(MEASURE, "a", () => {});
			registerCondition(MEASURE, "one", () => {});
			registerCondition(MEASURE, "two", () => {});
		});

		await runUnits_(
			collectForkUnits(drainConditions()),
			new MemorySink<MeasureData>(),
		);

		expect(beforeAllCalls).toBe(2);
	});

	it("should run enclosing hooks outermost first and tear them down innermost first", async () => {
		const calls: string[] = [];

		registerCondition(MEASURE, "outer", () => {
			registerBeforeAll(() => {
				calls.push("outer:before");
			});
			registerAfterAll(() => {
				calls.push("outer:after");
			});

			registerCondition(MEASURE, "inner", () => {
				registerBeforeAll(() => {
					calls.push("inner:before");
				});
				registerAfterAll(() => {
					calls.push("inner:after");
				});
				registerCase(MEASURE, "a", () => {
					calls.push("case");
				});
			});
		});

		await runUnits_(
			collectForkUnits(drainConditions()),
			new MemorySink<MeasureData>(),
		);

		expect(calls).toEqual([
			"outer:before",
			"inner:before",
			"case",
			"inner:after",
			"outer:after",
		]);
	});

	it("should title the condition scope with the full path", async () => {
		registerCondition(MEASURE, "outer", () => {
			registerCondition(MEASURE, "inner", () => {
				registerCase(MEASURE, "a", () => {});
			});
		});

		const sink = new MemorySink<MeasureData>();

		await runForkUnit(forkUnit_(), neverAborted_(), {
			sink,
			file: BENCH_FILE_,
			parentScopeId: "ancestor",
		});

		expect(
			sink.events.find(
				(event) =>
					event.kind === "scope-start" && event.parentId === "ancestor",
			),
		).toMatchObject({ title: "outer > inner" });
	});

	it("should keep running after a case throws and report it as failed", async () => {
		const ran: string[] = [];

		registerCondition(MEASURE, "condition", () => {
			registerCase(MEASURE, "boom", () => {
				throw new Error("boom");
			});
			registerCase(MEASURE, "ok", () => {
				ran.push("ok");
			});
		});

		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnit(forkUnit_(), neverAborted_(), {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
		});

		expect(ran).toEqual(["ok"]);
		expect(outcome).toEqual({
			status: "failed",
			casesRun: 2,
			casesFailed: 1,
			pairedRounds: null,
			rounds: null,
		});
		expect(closedScopes_(sink)).toEqual([
			["boom", "failed"],
			["ok", "ok"],
			["condition", "failed"],
		]);
	});

	it("should skip every case and fail the condition when beforeAll throws", async () => {
		const ran: string[] = [];

		registerCondition(MEASURE, "condition", () => {
			registerBeforeAll(() => {
				throw new Error("setup failed");
			});
			registerCase(MEASURE, "a", () => {
				ran.push("a");
			});
			registerCase(MEASURE, "b", () => {
				ran.push("b");
			});
		});

		const sink = new MemorySink<MeasureData>();

		const outcome = await runForkUnit(forkUnit_(), neverAborted_(), {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
		});

		expect(ran).toEqual([]);
		expect(outcome).toEqual({
			status: "failed",
			casesRun: 0,
			casesFailed: 0,
			pairedRounds: null,
			rounds: null,
		});
		expect(closedScopes_(sink)).toEqual([
			["a", "skipped"],
			["b", "skipped"],
			["condition", "failed"],
		]);
	});

	it("should not run afterAll for a level whose beforeAll threw", async () => {
		const calls: string[] = [];

		registerCondition(MEASURE, "outer", () => {
			registerBeforeAll(() => {
				calls.push("outer:before");
			});
			registerAfterAll(() => {
				calls.push("outer:after");
			});

			registerCondition(MEASURE, "inner", () => {
				registerBeforeAll(() => {
					throw new Error("setup failed");
				});
				registerAfterAll(() => {
					calls.push("inner:after");
				});
				registerCase(MEASURE, "a", () => {});
			});
		});

		await runUnits_(
			collectForkUnits(drainConditions()),
			new MemorySink<MeasureData>(),
		);

		expect(calls).toEqual(["outer:before", "outer:after"]);
	});

	it("should run only the cases named by caseFilter", async () => {
		const ran: string[] = [];

		registerCondition(MEASURE, "condition", () => {
			for (const title of ["a", "b", "c"]) {
				registerCase(MEASURE, title, () => {
					ran.push(title);
				});
			}
		});

		await runForkUnit(forkUnit_(), neverAborted_(), {
			sink: new MemorySink<MeasureData>(),
			file: BENCH_FILE_,
			parentScopeId: null,
			caseFilter: ["c", "a"],
		});

		expect(ran).toEqual(["a", "c"]);
	});

	it("should emit a case result carrying the leaf's measure id", async () => {
		registerCondition(MEASURE, "condition", () => {
			registerCase(MEASURE, "a", (context) => {
				context.setCaseResult({ medianMs: 1 });
			});
		});

		const sink = new MemorySink<MeasureData>();

		await runForkUnit(forkUnit_(), neverAborted_(), {
			sink,
			file: BENCH_FILE_,
			parentScopeId: null,
		});

		expect(sink.snapshot().data).toEqual([
			{
				kind: "case-execution",
				measure: MEASURE,
				caseTitle: "a",
				arm: "shared",
				replicate: 0,
				result: { medianMs: 1 },
			},
		]);
	});

	it("should forward measureOptions to the case run context", async () => {
		let seen: Readonly<Record<string, unknown>> | null = null;

		registerCondition(MEASURE, "condition", () => {
			registerCase(MEASURE, "a", (context) => {
				seen = context.measureOptions;
			});
		});

		await runForkUnit(forkUnit_(), neverAborted_(), {
			sink: new MemorySink<MeasureData>(),
			file: BENCH_FILE_,
			parentScopeId: null,
			measureOptions: { maxRuns: 3 },
		});

		expect(seen).toEqual({ maxRuns: 3 });
	});
});
