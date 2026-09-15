import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";

import type { MeasureConditionInput, MeasurePlugin } from "./plugin.js";

/**
 * The authoritative frame for a whole condition: one row per case result, the
 * columns the measure derives from the set, then the measure's own last word.
 *
 * The single construction path every renderer uses. A live view holding only
 * some of the rows calls `caseRow`/`deriveFields` itself with what it has and
 * skips the last step, because an unfinished condition has nothing to
 * conclude.
 */
export function conditionFrame(
	plugin: MeasurePlugin,
	input: MeasureConditionInput,
): DataFrame {
	const frame = plugin.deriveFields(
		dataFrameFromRows(
			plugin.fields,
			input.results.map((result) => plugin.caseRow(result)),
			{ title: input.title },
		),
	);
	return plugin.finalizeCondition(frame, input);
}
