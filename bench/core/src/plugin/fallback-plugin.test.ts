import { getDataFrameColumnByName } from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import { conditionFrame } from "./condition-frame.js";
import { fallbackPlugin } from "./fallback-plugin.js";

describe("fallbackPlugin", () => {
	it("caseRow truncates the raw payload into the value column", () => {
		const plugin = fallbackPlugin("nope");
		expect(plugin.caseRow({ name: "a", value: 1 })).toEqual([
			"?",
			'{"name":"a","value":1}',
		]);
	});

	it("carries one row per case in `results`", () => {
		const plugin = fallbackPlugin("nope");
		const frame = conditionFrame(plugin, {
			title: "s",
			results: [{ value: 1 }, { value: 2 }],
		});
		expect(frame.rowCount).toBe(2);
		expect(getDataFrameColumnByName(frame, "value")).toEqual([
			'{"value":1}',
			'{"value":2}',
		]);
	});

	it("is empty when there are no results", () => {
		const plugin = fallbackPlugin("nope");
		expect(conditionFrame(plugin, { title: "s", results: [] }).rowCount).toBe(
			0,
		);
	});

	it("toJsonCase and toJsonCondition are the identity", () => {
		const plugin = fallbackPlugin("nope");
		const payload = { anything: true };
		expect(plugin.toJsonCase(payload)).toBe(payload);
		expect(plugin.toJsonCondition(payload)).toBe(payload);
	});

	it("proposes no chart, since nothing here knows what the numbers mean", () => {
		const plugin = fallbackPlugin("nope");
		expect(
			plugin.preferredView(conditionFrame(plugin, { title: "s", results: [] })),
		).toBeNull();
	});
});
