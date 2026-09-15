import { MemorySink } from "@ac-kit/app-report";
import { describe, expect, it } from "vitest";

import type { BenchPlugin } from "./partition-plugins.js";
import { partitionPlugins } from "./partition-plugins.js";
import { defineMeasurePlugin } from "./plugin.js";
import { defineReporterPlugin } from "./reporter-plugin.js";

function measure_(id: string) {
	return defineMeasurePlugin({
		id,
		label: id,
		parseCaseResult: (value) => value,
		parseConditionResult: (value) => value,
		fields: [],
		caseRow: () => [],
		warnings: () => [],
		pool: (executions) => executions[0]!.result,
		scheduling: { rounds: "many", grouping: "condition" },
		toJsonCase: (value) => value,
		toJsonCondition: (value) => value,
	});
}

function reporter_(id: string) {
	return defineReporterPlugin({ id, createSink: () => new MemorySink() });
}

describe("partitionPlugins", () => {
	it("splits by brand, keeping each kind's declaration order", () => {
		const { measures, reporters } = partitionPlugins([
			measure_("duration"),
			reporter_("json"),
			measure_("jitter"),
			reporter_("table"),
		]);

		expect(measures.map((plugin) => plugin.id)).toEqual(["duration", "jitter"]);
		expect(reporters.map((plugin) => plugin.id)).toEqual(["json", "table"]);
	});

	it("returns two empty lists for an empty list", () => {
		expect(partitionPlugins([])).toEqual({ measures: [], reporters: [] });
	});

	it("names the offending index when an entry is neither kind", () => {
		expect(() =>
			partitionPlugins([measure_("duration"), {} as BenchPlugin]),
		).toThrow(/plugins\[1\]/);
	});
});
