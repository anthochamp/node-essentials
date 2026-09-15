import type { MeasureComparison } from "@ac-bench/core/plugin";
import { createComparatorBy } from "@ac-kit/core";
import {
	columnCell,
	findDataFrameFieldIndexByName,
	type DataFrame,
} from "@ac-kit/model-dataset";

/**
 * Whether the measurements taken so far settle the comparison.
 *
 * A benchmark's job is to order its cases. Two cases whose intervals overlap
 * are not ordered by the numbers: whichever came out ahead did so within the
 * noise, and another process could reverse it. That is the only signal worth
 * spending more machine time on, and it is measure-agnostic — the parent reads
 * it off the frame and the comparison every plugin already declares, rather
 * than knowing what any measure's numbers mean.
 *
 * Cases without an interval are ignored: an unknown interval is not an
 * overlapping one, and treating it as such would escalate forever.
 *
 * O(n log n) in the case count, for the sort.
 *
 * @param frame The condition's frame, from `MeasurePlugin.conditionFrame`.
 * @param comparison What the measure says orders its cases. A measure with no
 *   interval bounds makes no claim tight enough to escalate on.
 * @returns `true` when some adjacent pair cannot be told apart.
 */
export function comparisonUnresolved(
	frame: DataFrame,
	comparison: MeasureComparison | undefined,
): boolean {
	if (comparison?.interval === undefined) {
		return false;
	}

	const intervals: { lower: number; upper: number }[] = [];

	if (Array.isArray(comparison.interval)) {
		const [lowerField, upperField] = comparison.interval;

		const lowerIndex = findDataFrameFieldIndexByName(frame, lowerField);
		const upperIndex = findDataFrameFieldIndexByName(frame, upperField);
		const lowerColumn = frame.columns[lowerIndex];
		const upperColumn = frame.columns[upperIndex];
		if (lowerColumn === undefined || upperColumn === undefined) {
			return false;
		}

		for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
			const lower = columnCell(lowerColumn, rowIndex);
			const upper = columnCell(upperColumn, rowIndex);
			if (typeof lower === "number" && typeof upper === "number") {
				intervals.push({ lower, upper });
			}
		}
	} else if (typeof comparison.interval === "string") {
		const halfWidthField = comparison.interval;

		const fieldIndex = findDataFrameFieldIndexByName(frame, halfWidthField);
		const column = frame.columns[fieldIndex];
		if (column === undefined) {
			return false;
		}

		for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
			const halfWidth = columnCell(column, rowIndex);
			if (typeof halfWidth === "number") {
				intervals.push({ lower: halfWidth, upper: halfWidth });
			}
		}
	}

	// One case is not a comparison, and neither is none.
	if (intervals.length < 2) {
		return false;
	}

	intervals.sort(createComparatorBy((v) => v.lower));

	for (let index = 1; index < intervals.length; index++) {
		const previous = intervals[index - 1] as { upper: number };
		const current = intervals[index] as { lower: number };

		if (current.lower <= previous.upper) {
			return true;
		}
	}

	return false;
}
