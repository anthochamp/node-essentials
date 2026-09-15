import {
	defineMeasurePlugin,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import type { ReportDiagnostic } from "@ac-kit/app-report";
import type { FieldDescriptor, Value } from "@ac-kit/model-dataset";
import { DIMENSIONLESS } from "@ac-kit/model-dataset";
import * as z from "zod/mini";

import type {
	ConstantTimeCaseResult,
	ConstantTimeConditionResult,
} from "./_types.js";
import {
	constantTimeCaseResultSchema,
	constantTimeConditionResultSchema,
} from "./_types.js";

const MEASURE_ID = "constant-time";

function parseCaseResult_(value: unknown): ConstantTimeCaseResult {
	const result = constantTimeCaseResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

function parseConditionResult_(value: unknown): ConstantTimeConditionResult {
	const result = constantTimeConditionResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

const FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal", title: "case" },
	{
		name: "t",
		kind: "quantitative",
		title: "t",
		// Thresholded, not minimised: no direction is the honest answer here.
		unit: DIMENSIONLESS,
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
	{
		name: "degreesOfFreedom",
		kind: "quantitative",
		title: "df",
		format: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
	},
	{
		name: "samplesPerClass",
		kind: "quantitative",
		title: "n/class",
		format: { maximumFractionDigits: 0 },
	},
	{ name: "verdict", kind: "nominal", title: "verdict" },
];

function caseRow_(result: ConstantTimeCaseResult): Value[] {
	const stats = result.dudectResult;
	if (!stats) {
		return [
			result.title,
			null,
			null,
			null,
			`SKIPPED: ${result.failureMessage ?? "unknown"}`,
		];
	}

	return [
		result.title,
		stats.t,
		stats.degreesOfFreedom,
		stats.samplesPerClass,
		stats.leakDetected ? "⚠ leak detected" : "ok",
	];
}

export default defineMeasurePlugin<
	ConstantTimeCaseResult,
	ConstantTimeConditionResult
>({
	id: "constant-time",
	label: "Constant-time",

	parseCaseResult: parseCaseResult_,
	parseConditionResult: parseConditionResult_,

	fields: FIELDS,
	caseRow: caseRow_,

	// No `comparison`: a t-statistic is thresholded against a critical value,
	// not ordered against the other cases, so there is nothing to escalate on.

	warnings: (result): readonly ReportDiagnostic[] => {
		const diagnostics: ReportDiagnostic[] = [];
		if (result.failureMessage) {
			diagnostics.push({
				severity: "error",
				code: "case-failed",
				message: result.failureMessage,
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

	// dudect interleaves its own two classes inside one case; a second
	// interleaving layer above it (round-robin across cases) adds drift it
	// cannot cancel.
	scheduling: { rounds: "one", grouping: "condition" },

	// A leak verdict is not an average: one process finding a leak is a leak,
	// whatever the others saw. The most significant result stands for the case.
	pool: (executions) =>
		executions.reduce((worst, execution) =>
			Math.abs(execution.result.dudectResult?.t ?? 0) >
			Math.abs(worst.result.dudectResult?.t ?? 0)
				? execution
				: worst,
		).result,

	toJsonCase: (result): unknown => result,

	toJsonCondition: (result): unknown => ({
		constantTimeConditions: [result],
	}),
});
