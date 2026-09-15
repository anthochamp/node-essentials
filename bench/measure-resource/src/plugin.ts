import {
	defineMeasurePlugin,
	MeasureResultValidationError,
} from "@ac-bench/core/plugin";
import type { ReportDiagnostic } from "@ac-kit/app-report";
import type { FieldDescriptor, Value } from "@ac-kit/model-dataset";
import { BYTE, MILLISECOND } from "@ac-kit/model-dataset";
import * as z from "zod/mini";

import type {
	ResourceBenchRunCaseResult,
	ResourceBenchRunConditionResult,
} from "./_types.js";
import {
	resourceBenchRunCaseResultSchema,
	resourceBenchRunConditionResultSchema,
} from "./_types.js";

const MEASURE_ID = "resource";

function parseCaseResult_(value: unknown): ResourceBenchRunCaseResult {
	const result = resourceBenchRunCaseResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

function parseConditionResult_(
	value: unknown,
): ResourceBenchRunConditionResult {
	const result = resourceBenchRunConditionResultSchema.safeParse(value);
	if (!result.success) {
		throw new MeasureResultValidationError(
			MEASURE_ID,
			z.prettifyError(result.error),
		);
	}
	return result.data;
}

const BYTE_FORMAT = { maximumFractionDigits: 0 };
const MS_FORMAT = { minimumFractionDigits: 4, maximumFractionDigits: 4 };
const RATIO_FORMAT = { style: "percent" as const, maximumFractionDigits: 1 };

const FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal", title: "case" },
	{
		name: "allocatedBytes",
		kind: "quantitative",
		title: "alloc/op",
		unit: BYTE,
		direction: "lower-is-better",
		format: BYTE_FORMAT,
	},
	{
		name: "cpuTimeMs",
		kind: "quantitative",
		title: "cpu/op",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "heapPeakBytes",
		kind: "quantitative",
		title: "heap peak",
		unit: BYTE,
		direction: "lower-is-better",
		format: BYTE_FORMAT,
	},
	{
		name: "rssPeakBytes",
		kind: "quantitative",
		title: "rss peak",
		unit: BYTE,
		direction: "lower-is-better",
		format: BYTE_FORMAT,
	},
	{
		name: "gcPauseMs",
		kind: "quantitative",
		title: "gc/op",
		unit: MILLISECOND,
		direction: "lower-is-better",
		format: MS_FORMAT,
	},
	{
		name: "gcTimeRatio",
		kind: "quantitative",
		title: "gc share",
		direction: "lower-is-better",
		format: RATIO_FORMAT,
	},
	{
		name: "samples",
		kind: "quantitative",
		title: "n",
		format: { maximumFractionDigits: 0 },
	},
	{ name: "status", kind: "nominal", title: "status" },
];

function caseRow_(result: ResourceBenchRunCaseResult): Value[] {
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
		stats.allocatedBytes,
		stats.cpuTimeMs,
		stats.heapPeakBytes,
		stats.rssPeakBytes,
		stats.gcPauseMs,
		stats.gcTimeRatio,
		stats.samples,
		result.forcedCollection ? null : "no --expose-gc",
	];
}

export default defineMeasurePlugin<
	ResourceBenchRunCaseResult,
	ResourceBenchRunConditionResult
>({
	id: MEASURE_ID,
	label: "Resource",

	parseCaseResult: parseCaseResult_,
	parseConditionResult: parseConditionResult_,

	fields: FIELDS,
	caseRow: caseRow_,

	// Bytes allocated is the figure this measure exists to compare, and it is
	// deterministic enough to order cases by without an interval.
	comparison: { field: "allocatedBytes" },

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

	// A shared process makes heap attribution impossible — case A's garbage is
	// in case B's heap — so each case gets its own, and interleaving rounds
	// would defeat the same thing at a coarser grain.
	scheduling: {
		rounds: "one",
		grouping: "case",
		execArgv: ["--expose-gc"],
	},

	// Each execution measured its own process's heap. Pooling them would average
	// two heaps that never coexisted, so the first is reported as it stands.
	pool: (executions) => executions[0]!.result,

	toJsonCase: (result): unknown => result,

	toJsonCondition: (result): unknown => ({
		resourceConditions: [{ kind: "resource" as const, ...result }],
	}),
});
