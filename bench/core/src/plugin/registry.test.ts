import { describe, expect, it } from "vitest";

import { conditionFrame } from "./condition-frame.js";
import type { MeasurePluginSpec } from "./plugin.js";
import { defineMeasurePlugin, MEASURE_PLUGIN_TAG } from "./plugin.js";
import { isMeasurePlugin, MeasureRegistry } from "./registry.js";

type FakeCase = { name: string };
type FakeCondition = { title: string; cases: readonly FakeCase[] };

const fakeSpec: MeasurePluginSpec<FakeCase, FakeCondition> = {
	id: "fake",
	label: "Fake",
	parseCaseResult: (value) => value as FakeCase,
	parseConditionResult: (value) => value as FakeCondition,
	fields: [{ name: "name", kind: "nominal" }],
	caseRow: (result) => [result.name],
	warnings: () => [],
	pool: (executions) => executions[0]!.result,
	scheduling: { rounds: "many", grouping: "condition" },
	toJsonCase: (result) => result,
	toJsonCondition: (result) => result,
};

describe("MeasureRegistry", () => {
	it("resolves a registered plugin by id", () => {
		const registry = new MeasureRegistry();
		const plugin = defineMeasurePlugin(fakeSpec);
		registry.register(plugin);

		expect(registry.has("fake")).toBe(true);
		expect(registry.resolve("fake")).toBe(plugin);
		expect(registry.ids()).toEqual(["fake"]);
	});

	it("an unknown id resolves to a fallback plugin instead of throwing", () => {
		const registry = new MeasureRegistry();

		expect(registry.has("nope")).toBe(false);
		const fallback = registry.resolve("nope");
		expect(fallback.id).toBe("nope");
		expect(conditionFrame(fallback, { title: "s", results: [] }).rowCount).toBe(
			0,
		);
		expect(fallback.warnings({})).toEqual([
			expect.objectContaining({ severity: "error", code: "unknown-measure" }),
		]);
	});
});

describe("isMeasurePlugin", () => {
	it("accepts a value produced by defineMeasurePlugin", () => {
		expect(isMeasurePlugin(defineMeasurePlugin(fakeSpec))).toBe(true);
	});

	it("rejects a structurally identical object missing the brand", () => {
		const { [MEASURE_PLUGIN_TAG]: _tag, ...impostor } =
			defineMeasurePlugin(fakeSpec);
		expect(isMeasurePlugin(impostor)).toBe(false);
		expect(isMeasurePlugin(null)).toBe(false);
		expect(isMeasurePlugin("fake")).toBe(false);
	});
});
