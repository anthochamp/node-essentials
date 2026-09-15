import { describe, expect, it } from "vitest";

import type { MeasureData } from "../common/measure-data.js";
import {
	buildConditionInput,
	groupCaseResultsByMeasure,
} from "./condition-input.js";

function caseResult_(measure: string, caseTitle: string): MeasureData {
	return { kind: "case-result", measure, caseTitle, result: caseTitle };
}

describe("groupCaseResultsByMeasure", () => {
	it("keeps one group per measure, in first-seen order", () => {
		const groups = groupCaseResultsByMeasure([
			caseResult_("duration", "a"),
			caseResult_("jitter", "b"),
			caseResult_("duration", "c"),
		]);

		expect([...groups.keys()]).toEqual(["duration", "jitter"]);
		expect(groups.get("duration")?.map((item) => item.caseTitle)).toEqual([
			"a",
			"c",
		]);
	});

	it("ignores data that is not a case result", () => {
		const groups = groupCaseResultsByMeasure([
			{
				kind: "case-execution",
				measure: "duration",
				caseTitle: "a",
				arm: "shared",
				replicate: 0,
				result: 1,
			},
			{ kind: "load-error", file: "x.bench.ts", message: "boom" },
			caseResult_("duration", "a"),
		]);

		expect(groups.get("duration")).toHaveLength(1);
	});
});

describe("buildConditionInput", () => {
	it("carries the environment it was given", () => {
		const input = buildConditionInput("duration", [
			{ kind: "case-result", measure: "duration", caseTitle: "a", result: 1 },
		]);

		expect(input).toEqual({
			title: "duration",
			results: [1],
		});
	});
});
