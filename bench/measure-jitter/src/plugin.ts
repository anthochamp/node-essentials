import {
	defineMeasurePlugin,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import type { ReportDiagnostic } from "@ac-kit/app-report";
import type { FieldDescriptor, Value } from "@ac-kit/model-dataset";
import { MILLISECOND } from "@ac-kit/model-dataset";
import * as z from "zod/mini";

import type {
	JitterBenchRunCaseResult,
	JitterBenchRunConditionResult,
} from "./_types.js";
import {
	jitterBenchRunCaseResultSchema,
	jitterBenchRunConditionResultSchema,
} from "./_types.js";

const MEASURE_ID = "jitter";

function parseCaseResult_(value: unknown): JitterBenchRunCaseResult {
	const result = jitterBenchRunCaseResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

function parseConditionResult_(value: unknown): JitterBenchRunConditionResult {
	const result = jitterBenchRunConditionResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

const MS_FORMAT = { minimumFractionDigits: 3, maximumFractionDigits: 3 };

const FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal", title: "case" },
	{
		name: "medianMs",
		kind: "quantitative",
		title: "p50 late",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "p99Ms",
		kind: "quantitative",
		title: "p99 late",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "maxMs",
		kind: "quantitative",
		title: "max late",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "meanAbsoluteMs",
		kind: "quantitative",
		title: "mae",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "driftMsPerSecond",
		kind: "quantitative",
		title: "drift",
		unit: { symbol: "ms/s", scale: 0 },
		direction: "lower-is-better",
		format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
	},
	{
		name: "overruns",
		kind: "quantitative",
		title: "overruns",
		direction: "lower-is-better",
		format: { maximumFractionDigits: 0 },
	},
	{
		name: "samples",
		kind: "quantitative",
		title: "n",
		format: { maximumFractionDigits: 0 },
	},
	{ name: "status", kind: "nominal", title: "status" },
];

function caseRow_(result: JitterBenchRunCaseResult): Value[] {
	const stats = result.statistics;
	if (!stats) {
		return [
			result.name,
			null,
			null,
			null,
			null,
			null,
			null,
			null,
			`FAILED: ${result.failure ?? "unknown"}`,
		];
	}

	return [
		result.name,
		stats.medianMs,
		stats.p99Ms,
		stats.maxMs,
		stats.meanAbsoluteMs,
		stats.driftMsPerSecond,
		stats.overruns,
		stats.samples,
		null,
	];
}

export default defineMeasurePlugin<
	JitterBenchRunCaseResult,
	JitterBenchRunConditionResult
>({
	id: "jitter",
	label: "Jitter",

	parseCaseResult: parseCaseResult_,
	parseConditionResult: parseConditionResult_,

	fields: FIELDS,
	caseRow: caseRow_,

	// No interval bounds: lateness is signed and expected near zero, so the
	// measure makes no claim tight enough to order cases by.
	comparison: { field: "medianMs" },

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

	// `monitorEventLoopDelay` is condition-scoped, so an interleaved histogram would
	// measure the schedule rather than the case.
	scheduling: { rounds: "one", grouping: "condition" },

	// A jitter histogram describes one process's schedule. Two processes'
	// histograms are two answers to two different questions, and averaging them
	// would describe a schedule that never happened.
	pool: (executions) => executions[0]!.result,

	toJsonCase: (result): unknown => result,

	toJsonCondition: (result): unknown => ({
		latencyConditions: [{ kind: "latency" as const, ...result }],
	}),
});
