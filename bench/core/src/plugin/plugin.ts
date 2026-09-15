import type { ReportDiagnostic } from "@ac-kit/app-report";
import type { PlotSpec } from "@ac-kit/model-chart";
import type { DataFrame, FieldDescriptor, Value } from "@ac-kit/model-dataset";
import * as z from "zod/mini";

import type { MeasureId, MeasurementArm } from "../common/measure-data.js";

/** One execution's result, tagged with the context that produced it. */
export type MeasureExecution<TResult> = {
	readonly result: TResult;
	readonly arm: MeasurementArm;
	/** 0-based index within its arm. */
	readonly replicate: number;
};

/**
 * Brands a `MeasurePlugin` so `isMeasurePlugin` can check for it nominally
 * instead of validating every member's shape — only `defineMeasurePlugin` and
 * `fallbackAdapter` ever attach it.
 */
export const MEASURE_PLUGIN_TAG: unique symbol = Symbol("MeasurePlugin");

/**
 * The generic "whole condition" value the CLI builds by grouping `case-result`
 * events by measure id, before handing it to an plugin's
 * `parseConditionResult`. This is what a real child-process boundary will
 * eventually carry as a `condition-result` event (§4.6, not yet emitted by any
 * measure); until then, the parent assembles it itself from the case results it
 * already collected.
 */
export const measureConditionInputSchema = z.object({
	title: z.string(),
	results: z.array(z.unknown()),
});
export type MeasureConditionInput = z.infer<typeof measureConditionInputSchema>;

/** How a measure constrains the scheduler, never the reverse. */
export type MeasureScheduling = {
	/**
	 * `"one"` forbids round-robin interleaving: this measure's cases must each
	 * run to completion. Default `"many"`.
	 */
	readonly rounds: "one" | "many";

	/**
	 * `"case"` forces one child process per case rather than per fork unit.
	 * Default `"condition"`.
	 */
	readonly grouping: "condition" | "case";

	/**
	 * Extra `execArgv` every child running this measure must be forked with, e.g.
	 * `--expose-gc`. Merged with the run's own, conflicts are an error.
	 */
	readonly execArgv?: readonly string[];

	/** Environment variables the child needs. Same merge rules as `execArgv`. */
	readonly env?: Readonly<Record<string, string>>;
};

/**
 * Which field orders the cases against each other, and which fields bound that
 * estimate's uncertainty.
 *
 * Read by the escalation policy, which asks whether two cases can be told
 * apart, and by any renderer marking a row better or worse than its peers.
 * Absent when the measure makes no ordered claim.
 */
export type MeasureComparison = {
	/**
	 * The field whose value is the measure's central tendency, e.g. mean or
	 * median.
	 */
	readonly field: string;

	/**
	 * How this row's uncertainty is bounded. A single field name is a symmetric
	 * half-width around `field` (`field ± interval`); a `[lower, upper]` pair is
	 * two independent bound fields, for a measure whose interval isn't symmetric.
	 * Absent when the measure reports a point estimate with no interval.
	 */
	readonly interval?: string | readonly [lower: string, upper: string];

	/**
	 * A derived, dimensionless field giving each row's standing against the best
	 * one, anchored at `1`. Absent when the measure derives none.
	 *
	 * Named separately from {@link field} because a reader judges a run by the
	 * ratio while the ranking is computed from the raw quantity, and only the
	 * measure knows which of its derived columns is which.
	 */
	readonly ratioField?: string;
};

/**
 * The concrete, fully-typed definition a measure package writes. The erasure to
 * {@link MeasurePlugin} happens once, inside {@link defineMeasurePlugin}.
 */
export type MeasurePluginSpec<TCase, TCondition> = {
	readonly id: MeasureId;

	/** Human-readable name for `--list` and error messages. */
	readonly label: string;

	/** Validates a value that crossed the process boundary. Throws on mismatch. */
	parseCaseResult(value: unknown): TCase;
	parseConditionResult(value: unknown): TCondition;

	/**
	 * Schema of one case row: fixed per measure, known before the first case
	 * finishes, so a live view can lay out its columns up front.
	 *
	 * The measure declares what it measured — unit, precision, which way is
	 * better — and never how it looks. Formatting is the renderer's.
	 */
	readonly fields: readonly FieldDescriptor[];

	/** One row per case, in {@link fields} order. Raw values, never formatted text. */
	caseRow(result: TCase): Value[];

	/**
	 * Condition-level fields the case rows cannot carry — a ratio to the fastest,
	 * a share of a total, a rank.
	 *
	 * Reads the frame rather than the raw case results, so it runs on whatever
	 * rows exist at the time: a live view showing three of five cases gets its
	 * ratio-so-far, instead of a column that only appears once the condition
	 * ends. Put a derivation here whenever the frame is enough for it.
	 *
	 * Absent when every column a case can have is already in {@link fields}.
	 */
	deriveFields?(frame: DataFrame): DataFrame;

	/**
	 * The measure's last word on a condition, once every case has reported.
	 *
	 * Differs from {@link deriveFields} only in what it is handed: the parsed
	 * condition as well as the frame, so anything the measure knows but never
	 * projected into a column still reaches the output. Free to reshape the frame
	 * — rewrite the title, append footnotes, mark a cell with a footnote
	 * reference, add a column.
	 *
	 * Prefer {@link deriveFields} where the frame suffices: a column added here
	 * cannot appear before the condition ends.
	 */
	finalizeCondition?(frame: DataFrame, condition: TCondition): DataFrame;

	/** How the cases order against each other, when they do. */
	readonly comparison?: MeasureComparison;

	/**
	 * The chart this measure would rather be shown as.
	 *
	 * A hint: a renderer that cannot draw it falls back down the spec's own chain
	 * and finally to the frame as a table. Declared now though every measure
	 * returns `null` today, because adding a member once third-party plugins
	 * exist is a breaking change.
	 */
	preferredView?(frame: DataFrame): PlotSpec | null;

	/** Structured problems, in the generic severity-carrying shape. */
	warnings(result: TCase): readonly ReportDiagnostic[];

	/**
	 * Folds every execution of one case into the single result that answers for
	 * it.
	 *
	 * The parent runs a case in several processes and holds every result, but a
	 * case result is opaque to it: only the measure knows which of its numbers is
	 * the estimate, what that estimate's uncertainty is, and how to build a
	 * result carrying the pooled answer. `poolRandomEffects`
	 * (`@ac-kit/math-stats`) is the arithmetic; this is the only place that knows
	 * what to feed it.
	 *
	 * Required rather than optional, for the same reason as {@link fields}: there
	 * is no honest default — returning the first execution silently discards the
	 * rest — and a required method added once third-party plugins exist is a
	 * breaking change.
	 *
	 * @param executions At least one, in no particular order.
	 * @returns The pooled result. Given exactly one execution, that execution's
	 *   own result, so an unreplicated run reports exactly what it measured.
	 */
	pool(executions: readonly MeasureExecution<TCase>[]): TCase;

	/** How this measure must be scheduled. */
	readonly scheduling: MeasureScheduling;

	/** Richer than {@link caseRow}: what a JSON archive keeps for one case. */
	toJsonCase(result: TCase): unknown;

	/**
	 * Richer than a rendered frame: what a JSON archive keeps for a whole
	 * condition.
	 */
	toJsonCondition(result: TCondition): unknown;
};

/** Every method takes `unknown` and validates before dispatching. */
export type MeasurePlugin = {
	readonly [MEASURE_PLUGIN_TAG]: true;
	readonly id: MeasureId;
	readonly label: string;
	readonly fields: readonly FieldDescriptor[];
	readonly comparison?: MeasureComparison;
	readonly scheduling: MeasureScheduling;
	caseRow(result: unknown): Value[];
	deriveFields(frame: DataFrame): DataFrame;
	finalizeCondition(frame: DataFrame, condition: unknown): DataFrame;
	preferredView(frame: DataFrame): PlotSpec | null;
	warnings(result: unknown): readonly ReportDiagnostic[];
	pool(executions: readonly MeasureExecution<unknown>[]): unknown;
	toJsonCase(result: unknown): unknown;
	toJsonCondition(result: unknown): unknown;
};

/**
 * Builds the type-erased {@link MeasurePlugin} a `MeasureRegistry` stores, from
 * the fully-typed {@link MeasurePluginSpec} a measure package writes.
 *
 * Every erased method re-validates its argument through `parseCaseResult`/
 * `parseConditionResult` before dispatching, rather than casting — a payload
 * that crossed a process boundary (or, in this slice, was merely grouped by
 * measure id from a shared event stream) is never trusted without that check.
 * `toJsonCase`/`toJsonCondition` each validate against their own shape rather
 * than guessing which one a value is from a member it happens to have.
 */
export function defineMeasurePlugin<TCase, TCondition>(
	spec: MeasurePluginSpec<TCase, TCondition>,
): MeasurePlugin {
	return {
		[MEASURE_PLUGIN_TAG]: true,
		id: spec.id,
		label: spec.label,
		fields: spec.fields,
		scheduling: spec.scheduling,
		...(spec.comparison === undefined ? {} : { comparison: spec.comparison }),

		caseRow: (result) => spec.caseRow(spec.parseCaseResult(result)),

		deriveFields: (frame) => spec.deriveFields?.(frame) ?? frame,

		finalizeCondition: (frame, condition) =>
			spec.finalizeCondition?.(frame, spec.parseConditionResult(condition)) ??
			frame,

		preferredView: (frame) => spec.preferredView?.(frame) ?? null,

		warnings: (result) => spec.warnings(spec.parseCaseResult(result)),

		pool: (executions) =>
			spec.pool(
				executions.map((execution) => ({
					...execution,
					result: spec.parseCaseResult(execution.result),
				})),
			),

		toJsonCase: (result) => spec.toJsonCase(spec.parseCaseResult(result)),

		toJsonCondition: (result) =>
			spec.toJsonCondition(spec.parseConditionResult(result)),
	};
}
