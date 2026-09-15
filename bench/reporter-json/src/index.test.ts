import type {
	MeasureCaseResult,
	MeasureData,
	ReporterContext,
} from "@ac-bench/core/plugin";
import { defineMeasurePlugin, MeasureRegistry } from "@ac-bench/core/plugin";
import type { ISink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import jsonReporter from "./index.js";

/** Echoes its own id back, so a section can be traced to the measure. */
function fakePlugin_(id: string) {
	return defineMeasurePlugin({
		id,
		label: id,
		parseCaseResult: (value) => value,
		parseConditionResult: (value) => value as { results: unknown[] },
		fields: [{ name: "value", kind: "nominal", title: "value" }],
		caseRow: () => ["ok"],
		warnings: () => [],
		pool: (executions) => executions[0]!.result,
		scheduling: { rounds: "many", grouping: "condition" },
		toJsonCase: (value) => value,
		toJsonCondition: (result) => ({ [id]: result.results }),
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

describe("jsonReporter", () => {
	it("writes one section per measure present in the run", async () => {
		const written: string[] = [];
		await render_(jsonReporter().createSink(memoryContext_(written)));

		expect(JSON.parse(written.join(""))).toEqual({
			duration: ["fast"],
			jitter: ["steady"],
		});
	});

	it("is selected by the id 'json'", () => {
		expect(jsonReporter().id).toBe("json");
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

		jsonReporter().createSink(context);
		jsonReporter({ output: "elsewhere/run.json" }).createSink(context);

		expect(names).toEqual(["bench-results.json", "elsewhere/run.json"]);
	});
});
