import type {
	MeasureCaseResult,
	MeasureData,
	ReporterContext,
} from "@ac-bench/core/plugin";
import { defineMeasurePlugin, MeasureRegistry } from "@ac-bench/core/plugin";
import type { ISink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import csvReporter from "./index.js";

/** One row per case, so a rendered table can be matched line by line. */
function fakePlugin_(id: string) {
	return defineMeasurePlugin({
		id,
		label: id,
		parseCaseResult: (value) => value as string,
		parseConditionResult: (value) => value as { results: string[] },
		fields: [{ name: "case", kind: "nominal", title: "case" }],
		caseRow: (result) => [result],
		warnings: () => [],
		pool: (executions) => executions[0]!.result,
		scheduling: { rounds: "many", grouping: "condition" },
		toJsonCase: (value) => value,
		toJsonCondition: (value) => value,
	});
}

function twoMeasureRegistry_(): MeasureRegistry {
	const registry = new MeasureRegistry();
	registry.register(fakePlugin_("duration"));
	registry.register(fakePlugin_("jitter"));
	return registry;
}

function caseResult_(measure: string, caseTitle: string): MeasureCaseResult {
	return { kind: "case-result", measure, caseTitle, result: caseTitle };
}

/** Collects everything written, so no file is involved. */
function memoryContext_(written: string[]): ReporterContext {
	return {
		registry: twoMeasureRegistry_(),
		terminal: {} as ReporterContext["terminal"],
		defaultOutput: "bench-results",
		stdout: new WritableStream<string>(),
		openOutput: () =>
			new WritableStream<string>({
				write(chunk) {
					written.push(chunk);
				},
			}),
	};
}

async function render_(sink: ISink<MeasureData>): Promise<void> {
	void sink.write({
		kind: "data",
		timestamp: 0,
		scopeId: "s1",
		data: caseResult_("duration", "fast"),
	});
	void sink.write({
		kind: "data",
		timestamp: 0,
		scopeId: "s1",
		data: caseResult_("jitter", "steady"),
	});
	await sink.close();
}

describe("csvReporter", () => {
	it("renders one table per measure present in the run", async () => {
		const written: string[] = [];
		await render_(csvReporter().createSink(memoryContext_(written)));

		const rendered = written.join("");
		expect(rendered).toContain("fast");
		expect(rendered).toContain("steady");
		// Two tables, so two header rows.
		expect(rendered.match(/^case$/gm) ?? []).toHaveLength(2);
	});

	it("is selected by the id 'csv'", () => {
		expect(csvReporter().id).toBe("csv");
	});

	it("writes to the run's output base name unless given a path", () => {
		const names: string[] = [];
		const context: ReporterContext = {
			...memoryContext_([]),
			openOutput: (fileName) => {
				names.push(fileName);
				return new WritableStream<string>();
			},
		};

		csvReporter().createSink(context);
		csvReporter({ output: "artifacts/bench.csv" }).createSink(context);

		expect(names).toEqual(["bench-results.csv", "artifacts/bench.csv"]);
	});
});
