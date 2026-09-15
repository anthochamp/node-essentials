import { groupBy } from "@ac-kit/algo";

import type {
	MeasureCaseResult,
	MeasureData,
	MeasureId,
} from "../common/measure-data.js";
import type { MeasureConditionInput } from "./plugin.js";

/** Every `case-result` observed during a run, keyed by its `measure`. */
export function groupCaseResultsByMeasure(data: readonly MeasureData[]) {
	return groupBy(
		data.filter((item) => item.kind === "case-result"),
		[(item) => item.measure],
	);
}

/**
 * Assembles one measure's case results into the generic "whole condition" value
 * a plugin's `parseConditionResult` validates. No wire `condition-result` event
 * exists yet, so the parent builds this itself from the case results it already
 * collected.
 */
export function buildConditionInput(
	measureId: MeasureId,
	caseResults: readonly MeasureCaseResult[],
): MeasureConditionInput {
	return {
		title: measureId,
		results: caseResults.map((item) => item.result),
	};
}
