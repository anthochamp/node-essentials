import type { ReportDiagnostic } from "@ac-kit/app-report";
import { jsonStringifySafe } from "@ac-kit/core";
import type { PlotSpec } from "@ac-kit/model-chart";
import type { DataFrame, FieldDescriptor, Value } from "@ac-kit/model-dataset";

import type { MeasureId } from "../common/measure-data.js";
import type { MeasurePlugin } from "./plugin.js";
import { MEASURE_PLUGIN_TAG } from "./plugin.js";

/** Cap on how much of a raw payload's JSON rendering is shown. */
const TRUNCATE_LENGTH = 200;

const FALLBACK_FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal", title: "Case" },
	{ name: "value", kind: "nominal", title: "Result" },
];

function truncatedJson_(value: unknown): string {
	const text = jsonStringifySafe(value) ?? String(value);
	return text.length > TRUNCATE_LENGTH
		? `${text.slice(0, TRUNCATE_LENGTH)}…`
		: text;
}

/**
 * Plugin used for a `measure` id no registered plugin declares. A plugin id
 * typo must not lose a measurement that already cost minutes to produce: the
 * data is still shown, just without measure-specific formatting.
 */
export function fallbackPlugin(id: MeasureId): MeasurePlugin {
	return {
		[MEASURE_PLUGIN_TAG]: true,
		id,
		label: `Unknown measure "${id}"`,
		fields: FALLBACK_FIELDS,
		scheduling: { rounds: "many", grouping: "condition" },

		caseRow: (result): Value[] => ["?", truncatedJson_(result)],

		// Every column a case can have is already declared, so nothing is derived.
		deriveFields: (frame): DataFrame => frame,

		// Nothing here understands the payload, so it has nothing to conclude.
		finalizeCondition: (frame): DataFrame => frame,

		// Nothing here knows what these numbers mean, so no chart is proposed.
		preferredView: (): PlotSpec | null => null,

		warnings: (): readonly ReportDiagnostic[] => [
			{
				severity: "error",
				code: "unknown-measure",
				message: `No adapter is registered for measure "${id}"; showing the raw payload instead.`,
			},
		],

		// Nothing here knows what these numbers mean, so the first execution is
		// shown as-is rather than combined into something invented.
		pool: (executions): unknown => executions[0]?.result,

		toJsonCase: (result): unknown => result,

		toJsonCondition: (result): unknown => result,
	};
}
