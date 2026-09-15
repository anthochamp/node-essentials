import {
	defineMeasurePlugin,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import type { ReportDiagnostic } from "@ac-kit/app-report";
import {
	ratioWithUncertainty,
	type RatioWithUncertainty,
} from "@ac-kit/math-stats";
import type { DataFrame, FieldDescriptor } from "@ac-kit/model-dataset";
import {
	columnCell,
	dataFrameWithField,
	getDataFrameColumnByName,
	MILLISECOND,
	OPERATIONS_PER_SECOND,
} from "@ac-kit/model-dataset";
import * as z from "zod/mini";

import { poolDurationExecutions } from "./_pool.js";
import type {
	DurationBenchRunCaseResult,
	DurationBenchRunConditionResult,
} from "./_types.js";
import {
	durationBenchRunCaseResultSchema,
	durationBenchRunConditionResultSchema,
} from "./_types.js";

const MEASURE_ID = "duration";

const FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal", title: "case" },
	{
		name: "medianMs",
		kind: "quantitative",
		title: "median",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
	{
		name: "medianMarginMs",
		kind: "quantitative",
		title: "ci",
		unit: MILLISECOND,
		prefix: "±",
		direction: "lower-is-better",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
	{
		name: "madMs",
		kind: "quantitative",
		title: "mad",
		unit: MILLISECOND,
		prefix: "±",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
	{
		name: "p95Ms",
		kind: "quantitative",
		title: "p95",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
	{
		name: "opsPerSecond",
		kind: "quantitative",
		title: "rate",
		unit: OPERATIONS_PER_SECOND,
		direction: "higher-is-better",
		format: { maximumFractionDigits: 0 },
	},
	{
		name: "samples",
		kind: "quantitative",
		title: "n",
		format: { maximumFractionDigits: 0 },
	},
	{
		name: "adjustedMs",
		kind: "quantitative",
		title: "adjusted",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
];

/**
 * Half-width of the interval around the reported estimate.
 *
 * Prefers the pooled interval, which accounts for the spread between the
 * processes that measured the case; the within-process interval alone would
 * claim a precision no single process can support.
 */
function getEstimatedUncertainty(result: DurationBenchRunCaseResult): number {
	if (result.estimate !== null) {
		return (result.estimate.upperMs - result.estimate.lowerMs) / 2;
	}

	return result.statistics!.medianConfidence95Ms;
}

/** One field's cells as numbers, with anything non-numeric read as absent. */
function numericColumn_(frame: DataFrame, name: string): (number | null)[] {
	const column = getDataFrameColumnByName(frame, name);
	const values = Array.from<number | null>({ length: frame.rowCount });
	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		const value = columnCell(column, rowIndex);
		values[rowIndex] = typeof value === "number" ? value : null;
	}
	return values;
}

/** The dispersion `relativeTo` wants, rebuilt from the two reported columns. */
function relativeSpread_(centre: number, mad: number | null): number {
	return mad === null || centre <= 0 ? 0 : mad / centre;
}

export default defineMeasurePlugin<
	DurationBenchRunCaseResult,
	DurationBenchRunConditionResult
>({
	id: "duration",
	label: "Duration",

	fields: FIELDS,
	caseRow: (result) => {
		const stats = result.statistics;
		if (!stats) {
			return [result.name, null, null, null, null, null, null, null];
		}

		const uncertainty = getEstimatedUncertainty(result);
		return [
			result.name,
			stats.medianMs,
			uncertainty,
			stats.madMs,
			stats.p95Ms,
			stats.opsPerSecond ?? null,
			stats.samples,
			result.adjusted ? result.adjusted.medianMs : null,
		];
	},

	comparison: {
		field: "medianMs",
		interval: "medianMarginMs",
		ratioField: "ratio",
	},

	deriveFields: (frame): DataFrame => {
		const medians = numericColumn_(frame, "medianMs");
		const mads = numericColumn_(frame, "madMs");

		let fastestIndex = -1;
		let fastest = Number.POSITIVE_INFINITY;
		for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
			const median = medians[rowIndex] ?? null;
			if (median !== null && median < fastest) {
				fastestIndex = rowIndex;
				fastest = median;
			}
		}
		if (fastestIndex === -1 || fastest <= 0) {
			return frame;
		}

		const baselineSpread = relativeSpread_(fastest, mads[fastestIndex] ?? null);

		// `relativeTo` needs only a centre and a relative spread, both of which the
		// frame already carries — so the ratio is derived from the rows on show
		// rather than from the raw results, and a partial frame derives partial
		// ratios instead of no column at all.
		const ratioAt = (rowIndex: number): RatioWithUncertainty | null => {
			const median = medians[rowIndex] ?? null;
			if (median === null) {
				return null;
			}
			return ratioWithUncertainty(
				median,
				relativeSpread_(median, mads[rowIndex] ?? null),
				fastest,
				baselineSpread,
			);
		};

		const withRatio = dataFrameWithField(
			frame,
			{
				name: "ratio",
				kind: "quantitative",
				title: "rel",
				direction: "lower-is-better",
				uncertaintyField: "ratioMargin",
				suffix: "×",
				format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
			},
			(_frame, rowIndex) =>
				rowIndex === fastestIndex ? 1 : (ratioAt(rowIndex)?.ratio ?? null),
		);

		return dataFrameWithField(
			withRatio,
			{
				name: "ratioMargin",
				kind: "quantitative",
				title: "margin",
				prefix: "±",
				suffix: "×",
				format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
			},
			(_frame, rowIndex) =>
				rowIndex === fastestIndex
					? null
					: (ratioAt(rowIndex)?.errorMargin ?? null),
		);
	},

	warnings: (result): readonly ReportDiagnostic[] => {
		const diagnostics: ReportDiagnostic[] = [];
		if (result.failure) {
			diagnostics.push({
				severity: "error",
				code: "case-failed",
				message: result.failure,
			});
		}
		for (const warning of result.warnings) {
			diagnostics.push({
				severity: "warning",
				code: warning.kind,
				message: warning.message,
			});
		}
		return diagnostics;
	},

	scheduling: { rounds: "many", grouping: "case" },

	pool: (executions) => poolDurationExecutions(executions),

	parseCaseResult: (value) => {
		const result = durationBenchRunCaseResultSchema.safeParse(value);
		if (!result.success) {
			throw new MeasureResultValidationError(
				MEASURE_ID,
				z.prettifyError(result.error),
			);
		}
		return result.data;
	},

	parseConditionResult: (value) => {
		const result = durationBenchRunConditionResultSchema.safeParse(value);
		if (!result.success) {
			throw new MeasureResultValidationError(
				MEASURE_ID,
				z.prettifyError(result.error),
			);
		}
		return result.data;
	},

	toJsonCase: (result): unknown => result,

	toJsonCondition: (result): unknown => ({
		conditions: [{ kind: "bench" as const, ...result }],
	}),
});
