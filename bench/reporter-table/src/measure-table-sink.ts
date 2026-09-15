/**
 * The live "table" reporter: an independent `ISink<MeasureData>` (not built on
 * `LiveRegionSink`/`Formatter`) purpose-built for one thing — drawing a
 * benchmark condition's result table incrementally, one row per case, instead
 * of dumping the whole thing at once when the condition finishes.
 *
 * Measure-aware only through `MeasureRegistry`: it contains no `switch` over
 * measure ids and imports nothing from `@ac-bench/measure-*`. Both the
 * incremental rows and the final table come from `MeasurePlugin.caseRow`/
 * `conditionTable`, uniformly for every measure.
 *
 * Flow, matching the scope/case tree `openScope`/`trackCaseScopes` already
 * produce:
 *
 * ```text
 * (construct)     nothing drawn yet
 * condition starts    "▶ Title — preparing…" (transient)
 * first case starts   the "preparing" line is replaced by the plugin's
 *                      columns and that case's row (spinner in place of its
 *                      numbers)
 * a case finishes      its row gets its real numbers; a new row (spinner)
 *                      appears for the next case as it starts
 * condition finishes        the plugin's authoritative table plus a warning
 *                        recap are committed to scrollback; the transient
 *                        region clears
 * (close)         a final table recaps every warning/diagnostic and every
 *                 file-load error seen across the whole run
 * ```
 *
 * Degrades to plain sequential writes (no cursor movement, the same finished
 * tables this replaced) when `terminal.interactive` is `false`, for the same
 * reason `LiveRegionSink` does: redrawing in place corrupts a non-interactive
 * (CI) log.
 */

import type {
	MeasureComparison,
	MeasureConditionInput,
	MeasureData,
	MeasurePlugin,
	MeasureRegistry,
	ReporterContext,
} from "@ac-bench/core/plugin";
import { conditionFrame } from "@ac-bench/core/plugin";
import type {
	ISink,
	ReportDiagnostic,
	ReportDiagnosticSeverity,
	ReportEvent,
	ReportScopeId,
} from "@ac-kit/app-report";
import type { LiveRegion, Terminal } from "@ac-kit/app-terminal";
import {
	createLiveRegion,
	glyphFor,
	isRedrawable,
	styleTextFor,
} from "@ac-kit/app-terminal";
import { PeriodicalTimer } from "@ac-kit/core";
import type { TableCellStyler } from "@ac-kit/format-monospace";
import { glyph, renderTable, spinnerGlyph } from "@ac-kit/format-monospace";
import type { DataFrame, FieldDescriptor, Value } from "@ac-kit/model-dataset";
import {
	columnCell,
	dataFrameDropEmptyFields,
	dataFrameFromRows,
	dataFrameSelectFields,
	dataFrameWithField,
	findDataFrameFieldIndexByName,
	isNumericField,
} from "@ac-kit/model-dataset";

import { ratioRowColors } from "./row-colors.js";

/** How often the spinner animates and the live region redraws. */
const TICK_MS = 100;

/**
 * Benchmark output is compared across machines and pasted into issues, so it is
 * formatted machine-neutrally rather than in whatever locale the runner has.
 */
const LOCALE = "en-US";

type RunningCase = {
	scopeId: ReportScopeId;
	name: string;
	startedAt: number;
};

/**
 * One case's row in the live/committed table.
 *
 * A case starts here the moment its scope opens (before it has a result), so
 * its declared position (`index`) is known even while `result` is still
 * `undefined`. `settled` becomes `true` only once the pooled `case-result`
 * arrives — until then `result` is the latest `case-execution` seen, which a
 * later execution or the eventual pooled answer both overwrite in place. This
 * is what makes a case one row, rewritten as better answers arrive, rather than
 * one row per execution.
 */
type CaseRow = {
	readonly index: number;
	result: unknown;
	/** The answer this case reported before `result`, for the trend arrow. */
	previous: unknown;
	hasPrevious: boolean;
	hasResult: boolean;
	settled: boolean;
};

type OpenCondition = {
	scopeId: ReportScopeId;
	title: string;
	measureId: string;
	/** Every case seen so far, keyed by title. */
	cases: Map<string, CaseRow>;
	running: RunningCase | null;
};

/**
 * One (condition, case, diagnostic) triple for the final recap table, with how
 * many times it was observed: the plan runs a condition several times, and the
 * same failure reported once per execution is one finding, not N.
 */
type DiagnosticRecord = {
	condition: string;
	case: string;
	severity: ReportDiagnosticSeverity;
	detail: string;
	count: number;
};

/** Most serious first, so the recap opens on what actually needs attention. */
const SEVERITY_ORDER: readonly ReportDiagnosticSeverity[] = [
	"error",
	"warning",
	"info",
];

/** A diagnostic line for a log, which has no columns to carry the attribution. */
function describeDiagnostic_(
	record: DiagnosticRecord | null,
	event: ReportEvent<MeasureData> & { kind: "diagnostic" },
): string {
	if (record === null) {
		return event.message;
	}

	const where =
		record.case.length > 0
			? `${record.condition} > ${record.case}`
			: record.condition;

	return `${where}: ${event.message}`;
}

function pendingRow_(columnCount: number, label: string): Value[] {
	return [label, ...Array.from<Value>({ length: columnCount - 1 }).fill(null)];
}

/**
 * The sink's own columns, prefixed so a measure declaring `status` or `trend`
 * of its own does not collide with them.
 */
const WINNER_FIELD = "@winner";
const TREND_FIELD = "@trend";
const SEVERITY_FIELD = "@severity";
const STATUS_FIELD = "@status";

const ANNOTATION_FIELDS: ReadonlySet<string> = new Set([
	WINNER_FIELD,
	TREND_FIELD,
	SEVERITY_FIELD,
	STATUS_FIELD,
]);

/**
 * What the sink knows about a row that the measure does not: whether it won,
 * which way it moved, and what went wrong.
 */
type RowAnnotation = {
	won: boolean;
	trend: "better" | "worse" | null;
	severity: "warning" | "error" | null;
	status: string | null;
};

/**
 * The interval a case reported around its representative value, or `null` when
 * the measure makes no bounded claim.
 */
function rowInterval_(
	row: readonly Value[],
	indices: { value: number; lower: number; upper: number },
): { lower: number; upper: number } | null {
	const lower = row[indices.lower];
	const upper = row[indices.upper];
	if (typeof lower !== "number" || typeof upper !== "number") {
		return null;
	}
	return { lower, upper };
}

/**
 * Which way a case moved against its own previous answer, ignoring anything
 * inside the noise floor.
 *
 * Two overlapping intervals are the same measurement seen twice, so only a
 * clean separation counts as a change — otherwise the arrow flips between runs
 * on nothing. A measure reporting no interval therefore never draws one.
 */
function rowTrend_(
	current: readonly Value[],
	previous: readonly Value[],
	indices: { value: number; lower: number; upper: number },
	higherIsBetter: boolean,
): "better" | "worse" | null {
	const now = rowInterval_(current, indices);
	const before = rowInterval_(previous, indices);
	if (now === null || before === null) {
		return null;
	}

	if (now.upper < before.lower) {
		return higherIsBetter ? "worse" : "better";
	}
	if (now.lower > before.upper) {
		return higherIsBetter ? "better" : "worse";
	}
	return null;
}

/**
 * Positions of the comparison field and its bounds within a plugin's row, or
 * `null` when the measure orders its cases without bounding them.
 */
function comparisonIndices_(
	fields: readonly FieldDescriptor[],
	comparison: MeasureComparison | undefined,
): {
	value: number;
	lower: number;
	upper: number;
	higherIsBetter: boolean;
} | null {
	if (comparison?.interval === undefined) {
		return null;
	}

	const value = fields.findIndex((field) => field.name === comparison.field);
	const field = fields[value];

	if (
		value === -1 ||
		field === undefined ||
		!isNumericField(field) ||
		field.direction === undefined ||
		field.direction === "neutral"
	) {
		return null;
	}

	let lower: number;
	let upper: number;

	if (Array.isArray(comparison.interval)) {
		const [lowerField, upperField] = comparison.interval;

		lower = fields.findIndex((field) => field.name === lowerField);
		upper = fields.findIndex((field) => field.name === upperField);
	} else {
		lower = upper = fields.findIndex(
			(field) => field.name === comparison.interval,
		);
	}
	if (lower === -1 || upper === -1) {
		return null;
	}

	return {
		value,
		lower,
		upper,
		higherIsBetter: field.direction === "higher-is-better",
	};
}

/** The row holding the best value of the comparison field, or `-1`. */
function winnerRowIndex_(
	frame: DataFrame,
	comparison: MeasureComparison | undefined,
): number {
	if (comparison === undefined) {
		return -1;
	}

	const fieldIndex = findDataFrameFieldIndexByName(frame, comparison.field);
	const field = frame.fields[fieldIndex];
	const column = frame.columns[fieldIndex];
	if (
		field === undefined ||
		column === undefined ||
		!isNumericField(field) ||
		field.direction === undefined ||
		field.direction === "neutral"
	) {
		return -1;
	}

	const higherIsBetter = field.direction === "higher-is-better";
	let best = -1;
	let bestValue = 0;
	for (let rowIndex = 0; rowIndex < frame.rowCount; rowIndex++) {
		const value = columnCell(column, rowIndex);
		if (typeof value !== "number") {
			continue;
		}
		if (
			best === -1 ||
			(higherIsBetter ? value > bestValue : value < bestValue)
		) {
			best = rowIndex;
			bestValue = value;
		}
	}
	return best;
}

/**
 * Adds the sink's own columns and moves each next to what it annotates.
 *
 * They are columns rather than decoration because every one of them occupies
 * width: `styleCell` runs after padding, so a glyph prepended there shifts the
 * row out of alignment with its header.
 *
 * O(r × f) in rows and fields, from the reordering pass.
 */
function annotate_(
	frame: DataFrame,
	annotations: readonly RowAnnotation[],
	comparison: MeasureComparison | undefined,
	terminal: Terminal,
): DataFrame {
	const columns: [string, (row: RowAnnotation) => Value][] = [
		[WINNER_FIELD, (row) => (row.won ? glyphFor(terminal, "winner") : null)],
		[
			TREND_FIELD,
			(row) => (row.trend === null ? null : glyphFor(terminal, row.trend)),
		],
		[
			SEVERITY_FIELD,
			(row) =>
				row.severity === null ? null : glyphFor(terminal, row.severity),
		],
		[STATUS_FIELD, (row) => row.status],
	];

	let annotated = frame;
	for (const [name, valueOf] of columns) {
		annotated = dataFrameWithField(
			annotated,
			{ name, kind: "nominal", title: "" },
			(_frame, rowIndex) => {
				const annotation = annotations[rowIndex];
				return annotation === undefined ? null : valueOf(annotation);
			},
		);
	}

	return dataFrameSelectFields(annotated, fieldOrder_(annotated, comparison));
}

/** Field names with each annotation column beside the thing it annotates. */
function fieldOrder_(
	frame: DataFrame,
	comparison: MeasureComparison | undefined,
): string[] {
	const order: string[] = [];
	for (const field of frame.fields) {
		if (ANNOTATION_FIELDS.has(field.name)) {
			continue;
		}
		if (order.length === 0) {
			order.push(WINNER_FIELD);
		}
		order.push(field.name);
		if (field.name === comparison?.field) {
			order.push(TREND_FIELD);
		}
	}
	if (!order.includes(TREND_FIELD)) {
		order.push(TREND_FIELD);
	}
	order.push(SEVERITY_FIELD, STATUS_FIELD);
	return order;
}

/** A row with nothing measured yet: no winner, no trend, just where it stands. */
function pendingAnnotation_(status: string): RowAnnotation {
	return { won: false, trend: null, severity: null, status };
}

/** The most serious severity among a case's diagnostics, if any. */
function worstSeverity_(
	diagnostics: readonly Pick<ReportDiagnostic, "severity">[],
): "warning" | "error" | null {
	if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
		return "error";
	}
	if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
		return "warning";
	}
	return null;
}

function severityText_(severity: "warning" | "error"): string {
	return severity === "error" ? "failed" : "see notes";
}

/**
 * The cells a row's colour lands on: the measure's ratio field, and whatever
 * field that one names as its uncertainty.
 *
 * The raw quantities stay uncoloured. They are what the ranking is computed
 * from, but a reader compares runs by the ratio, and tinting a column of
 * milliseconds says nothing a reader can act on.
 */
function coloredFields_(
	frame: DataFrame,
	comparison: MeasureComparison | undefined,
): ReadonlySet<string> {
	const name = comparison?.ratioField;
	if (name === undefined) {
		return new Set();
	}

	const field = frame.fields[findDataFrameFieldIndexByName(frame, name)];

	const uncertainty =
		field && isNumericField(field) ? field.uncertaintyField : undefined;

	return new Set(uncertainty === undefined ? [name] : [name, uncertainty]);
}

export class MeasureTableSink implements ISink<MeasureData> {
	private readonly terminal: Terminal;
	private readonly writer: WritableStreamDefaultWriter<string> | null;
	private readonly registry: MeasureRegistry;

	private open: OpenCondition | null = null;
	private readonly region: LiveRegion;
	private readonly tick: PeriodicalTimer | null;

	/**
	 * Every diagnostic attributable to a condition, deduplicated by what it says
	 * about which case, in first-observed order.
	 */
	private readonly diagnostics: Map<string, DiagnosticRecord> = new Map();

	/** The condition a diagnostic still belongs to once its scope has closed. */
	private lastCondition: string | null = null;
	private readonly loadErrors: { file: string; message: string }[] = [];

	/**
	 * Run-level diagnostics (cooldown, environment stability, …) not tied to one
	 * case.
	 */
	private readonly runDiagnostics: { severity: string; message: string }[] = [];

	/** What to show below the table while nothing case-shaped is happening. */
	private currentStatus: string | null = null;

	constructor(context: ReporterContext) {
		const { terminal } = context;

		this.terminal = terminal;
		this.registry = context.registry;
		this.writer = context.stdout.getWriter();
		this.region = createLiveRegion(terminal);

		if (!isRedrawable(terminal)) {
			this.tick = null;
			return;
		}

		this.tick = new PeriodicalTimer(() => this.redraw(), TICK_MS);
		this.tick.start();
	}

	write(event: ReportEvent<MeasureData>): void {
		switch (event.kind) {
			case "scope-start": {
				// Whatever was reported before real progress resumed is now stale.
				this.currentStatus = null;

				// A condition is whatever declares a measure; a scope without one is a
				// grouping ancestor, which owns no table of its own.
				const measureId = event.attributes?.["conditionMeasure"];

				if (typeof measureId === "string") {
					this.open = {
						scopeId: event.scopeId,
						title: event.title,
						measureId,
						cases: new Map(),
						running: null,
					};
				} else if (
					this.open &&
					typeof event.attributes?.["benchCase"] === "string"
				) {
					this.open.running = {
						scopeId: event.scopeId,
						name: event.title,
						startedAt: Date.now(),
					};
					this.registerCase_(event.title, event.attributes["benchCaseIndex"]);
				}
				break;
			}

			case "data":
				// Cleared here, not at the case's own `scope-end` (which follows right
				// after): otherwise a redraw landing between the two would show the
				// finished row twice — once from the case's row, once from the still-set
				// `running` placeholder.
				if (
					event.data.kind === "case-execution" &&
					this.open?.running?.scopeId === event.scopeId
				) {
					this.open.running = null;
				}
				this.handleData(event.data);
				break;

			case "scope-end":
				if (this.open?.scopeId === event.scopeId) {
					this.commitOpenCondition_();
				} else if (this.open?.running?.scopeId === event.scopeId) {
					this.open.running = null;
				}
				break;

			case "diagnostic": {
				// A diagnostic carrying a scope belongs to a condition; one raised
				// after that condition closed (a fork unit's failure is reported once
				// the parent has cleaned up after it) still belongs to the last one,
				// since conditions run one at a time.
				const condition = this.open?.title ?? this.lastCondition;

				const record =
					event.scopeId !== null && condition !== null
						? this.recordDiagnostic_(condition, event)
						: null;

				if (record === null) {
					this.runDiagnostics.push({
						severity: event.severity,
						message: event.message,
					});
				}
				// An error is a fact for the recap, not an ongoing status to display.
				if (event.severity !== "error") {
					this.currentStatus = event.message;
				}
				// Repeats carry no new information, and the recap counts them.
				if (!this.terminal.interactive && (record?.count ?? 1) === 1) {
					void this.writer?.write(
						`measure: ${describeDiagnostic_(record, event)}\n`,
					);
				}
				break;
			}

			case "output":
				// Whether a healthy child's output gets this far is the run's call,
				// not the table's: whatever arrives is worth showing.
				this.writeAboveRegion_(
					event.chunk
						.replace(/\n$/, "")
						.split("\n")
						.map((line) =>
							styleTextFor(this.terminal, `  [${event.stream}] ${line}`, {
								styles: ["dim"],
							}),
						),
				);
				break;

			default:
				break;
		}
	}

	/** Pushes lines to permanent scrollback without disturbing the live table. */
	private writeAboveRegion_(lines: readonly string[]): void {
		if (!this.writer || lines.length === 0) {
			return;
		}

		void this.writer.write(
			isRedrawable(this.terminal)
				? this.region([], [...lines])
				: `${lines.join("\n")}\n`,
		);
	}

	/** Files a diagnostic under the open condition, merging an exact repeat. */
	private recordDiagnostic_(
		condition: string,
		event: ReportEvent<MeasureData> & { kind: "diagnostic" },
	): DiagnosticRecord {
		const caseTitle = event.attributes?.["bench.case"];
		const caseName = typeof caseTitle === "string" ? caseTitle : "";
		const key = [condition, caseName, event.severity, event.message].join(
			"\u0000",
		);

		const existing = this.diagnostics.get(key);

		if (existing) {
			existing.count += 1;
			return existing;
		}

		const record: DiagnosticRecord = {
			condition,
			case: caseName,
			severity: event.severity,
			detail: event.message,
			count: 1,
		};

		this.diagnostics.set(key, record);

		return record;
	}

	async flush(): Promise<void> {
		await this.redraw();
		await this.writer?.ready;
	}

	async close(): Promise<void> {
		this.tick?.stop();
		await this.redraw();

		// only build and show the final recap if the terminal supports redraws, which hides every events during the run
		// on a non-redrawable terminal, the final recap just repeats what was already shown.
		if (isRedrawable(this.terminal)) {
			const recap = this.buildFinalRecap();
			if (recap.length > 0) {
				await this.writer?.write(`${recap.join("\n")}\n`);
			}
		}

		await this.writer?.close();
	}

	/** Creates a case's row on first sight, in its declared position. */
	private registerCase_(title: string, index: unknown): void {
		if (!this.open || this.open.cases.has(title)) {
			return;
		}

		this.open.cases.set(title, {
			index: typeof index === "number" ? index : this.open.cases.size,
			result: undefined,
			previous: undefined,
			hasPrevious: false,
			hasResult: false,
			settled: false,
		});
	}

	private handleData(data: MeasureData): void {
		switch (data.kind) {
			case "case-execution": {
				this.registerCase_(data.caseTitle, undefined);

				const row = this.open?.cases.get(data.caseTitle);
				// Never overwrites a settled row: a stray late execution is not a
				// better answer than the pooled one that already replaced it.
				if (row && !row.settled) {
					if (row.hasResult) {
						row.previous = row.result;
						row.hasPrevious = true;
					}
					row.result = data.result;
					row.hasResult = true;
				}
				break;
			}

			case "case-result": {
				this.registerCase_(data.caseTitle, undefined);

				const row = this.open?.cases.get(data.caseTitle);
				if (row) {
					row.result = data.result;
					row.hasResult = true;
					row.settled = true;
				}
				break;
			}

			case "load-error":
				this.loadErrors.push({ file: data.file, message: data.message });
				if (!this.terminal.interactive) {
					void this.writer?.write(
						`measure: failed to load ${data.file}: ${data.message}\n`,
					);
				}
				break;

			case "condition-result":
				break;

			default:
				break;
		}
	}

	/** Every seen case's row, in declaration order. */
	private orderedCases_(open: OpenCondition): [string, CaseRow][] {
		return [...open.cases].sort(([, a], [, b]) => a.index - b.index);
	}

	/**
	 * What to say about a case that has reported but not settled: which way it
	 * moved since its own last answer, and whether anything went wrong.
	 */
	private liveAnnotation_(
		plugin: MeasurePlugin,
		row: CaseRow,
		caseRow: readonly Value[],
		indices: ReturnType<typeof comparisonIndices_>,
	): RowAnnotation {
		const severity = worstSeverity_(plugin.warnings(row.result));
		const trend =
			row.settled || !row.hasPrevious || indices === null
				? null
				: rowTrend_(
						caseRow,
						plugin.caseRow(row.previous),
						indices,
						indices.higherIsBetter,
					);

		return {
			won: false,
			trend,
			severity,
			status:
				severity !== null
					? severityText_(severity)
					: row.settled
						? null
						: "in progress",
		};
	}

	/**
	 * Renders the finished table for the condition that just closed, records its
	 * diagnostics for the final recap, and clears `this.open`.
	 */
	private commitOpenCondition_(): void {
		const open = this.open;
		if (!open) {
			return;
		}

		const plugin = this.registry.resolve(open.measureId);
		const ordered = this.orderedCases_(open).filter(([, row]) => row.hasResult);

		const results = ordered.map(([, row]) => row.result);
		const conditionInput: MeasureConditionInput = {
			title: open.title,
			results,
		};
		const frame = conditionFrame(plugin, conditionInput);
		const winner = winnerRowIndex_(frame, plugin.comparison);

		// A settled case has no trend: the arrow tracked progress towards this
		// answer, and this is the answer.
		const annotations = ordered.map(([, row], rowIndex): RowAnnotation => {
			const severity = worstSeverity_(plugin.warnings(row.result));
			return {
				won: rowIndex === winner,
				trend: null,
				severity,
				status: severity === null ? null : severityText_(severity),
			};
		});

		const committed = dataFrameDropEmptyFields(
			annotate_(frame, annotations, plugin.comparison, this.terminal),
		);

		void this.commitFinalTable(
			renderTable(committed, {
				locale: LOCALE,
				styleCell: this.styleCell_(
					committed,
					plugin.comparison,
					[],
					annotations.findIndex((annotation) => annotation.won),
				),
				styleHeader: (text, position) => this.styleHeader_(text, position),
				styleTitle: (text) => this.styleTitle_(text),
				styleFootnote: (text) => this.styleFootnote_(text),
			}),
		);
	}

	private styleFootnote_(text: string): string {
		return styleTextFor(this.terminal, text, { styles: ["italic"] });
	}

	private styleTitle_(text: string): string {
		return styleTextFor(this.terminal, text, { styles: ["underline"] });
	}

	private styleHeader_(text: string, position: { row: number }): string {
		if (position.row === -1) {
			return styleTextFor(this.terminal, text.toLocaleUpperCase(LOCALE), {
				styles: ["bold"],
			});
		}
		return text;
	}

	/**
	 * How each cell is styled: dimmed while a row is unsettled, bold on the
	 * winner's ranking quantity, and tinted by the row's standing everywhere the
	 * ratio is shown.
	 *
	 * Built once per redraw so the ramp is sampled per row rather than per cell,
	 * and returns `undefined` for a non-interactive terminal, where escape codes
	 * would end up in a log file.
	 */
	private styleCell_(
		frame: DataFrame,
		comparison: MeasureComparison | undefined,
		dimmed: readonly boolean[],
		winnerRow: number,
	): TableCellStyler | undefined {
		if (!this.terminal.interactive) {
			return undefined;
		}

		const ratioField = comparison?.ratioField;
		const colors =
			ratioField === undefined ? [] : ratioRowColors(frame, ratioField);
		const colored = coloredFields_(frame, comparison);
		const ranked = comparison?.field;

		return (text, position) => {
			if (dimmed[position.row] === true) {
				return styleTextFor(this.terminal, text, { styles: ["dim"] });
			}
			if (position.row === winnerRow && position.column === 0) {
				return styleTextFor(this.terminal, text, {
					styles: ["bold"],
					foreground: { r8: 255, g8: 255, b8: 0 },
				});
			}
			if (position.row === winnerRow && position.field === ranked) {
				return styleTextFor(this.terminal, text, { styles: ["bold"] });
			}
			if (!colored.has(position.field)) {
				return text;
			}
			const foreground = colors[position.row] ?? null;
			return foreground === null
				? text
				: styleTextFor(this.terminal, text, { foreground });
		};
	}

	/** Renders the currently-open condition's live (not-yet-committed) lines. */
	private buildLiveLines(): string[] {
		const open = this.open;
		if (!open) {
			return this.currentStatus ? [this.statusLine_()] : [];
		}

		if (open.cases.size === 0) {
			return [
				`${glyph("triangleRight", this.terminal.unicode ? "unicode" : "ascii")} ${open.title}`,
				...(this.currentStatus ? [this.statusLine_()] : ["preparing…"]),
			];
		}

		const measurePlugin = this.registry.resolve(open.measureId);
		const indices = comparisonIndices_(
			measurePlugin.fields,
			measurePlugin.comparison,
		);
		const ordered = this.orderedCases_(open);
		const rows: Value[][] = [];
		const annotations: RowAnnotation[] = [];
		/** Parallel to `rows`: `"running"`/`"unsettled"` for dimming, or `null`. */
		const rowStyles: ("running" | "unsettled" | null)[] = [];

		for (const [title, row] of ordered) {
			if (open.running?.name === title) {
				rowStyles.push("running");
				annotations.push(pendingAnnotation_("in progress"));
				rows.push(
					pendingRow_(
						measurePlugin.fields.length,
						`${spinnerGlyph({ style: this.terminal.unicode ? "unicode" : "ascii", intervalMs: TICK_MS })} running ${title}…`,
					),
				);
			} else if (row.hasResult) {
				// Not yet the pooled answer: shown so the table fills in as soon as
				// there is anything to show, but dimmed so it is never mistaken for
				// the condition's final numbers.
				rowStyles.push(row.settled ? null : "unsettled");
				const caseRow = measurePlugin.caseRow(row.result);
				rows.push(caseRow);
				annotations.push(
					this.liveAnnotation_(measurePlugin, row, caseRow, indices),
				);
			} else {
				rowStyles.push(null);
				annotations.push(pendingAnnotation_("waiting"));
				rows.push(pendingRow_(measurePlugin.fields.length, title));
			}
		}

		// The same two calls the committed table makes, over the rows that exist
		// so far — so a derived column fills in during the run instead of
		// appearing only once the condition ends.
		const frame: DataFrame = dataFrameDropEmptyFields(
			annotate_(
				measurePlugin.deriveFields(
					dataFrameFromRows(measurePlugin.fields, rows, { title: open.title }),
				),
				annotations,
				measurePlugin.comparison,
				this.terminal,
			),
		);

		const rendered = renderTable(frame, {
			locale: LOCALE,
			styleCell: this.styleCell_(
				frame,
				measurePlugin.comparison,
				rowStyles.map((style) => style !== null),
				annotations.findIndex((annotation) => annotation.won),
			),
			styleHeader: (text, position) => this.styleHeader_(text, position),
			styleTitle: (text) => this.styleTitle_(text),
			styleFootnote: (text) => this.styleFootnote_(text),
		});

		return [
			...rendered.split("\n"),
			...(this.currentStatus ? [this.statusLine_()] : []),
		];
	}

	/** Dimmed, one-line summary of whatever isn't case-shaped progress. */
	private statusLine_(): string {
		return styleTextFor(this.terminal, `… ${this.currentStatus}`, {
			styles: ["dim"],
		});
	}

	/**
	 * Flushes the finished condition's table to permanent scrollback, replacing
	 * the live region.
	 */
	private async commitFinalTable(rendered: string): Promise<void> {
		this.lastCondition = this.open?.title ?? this.lastCondition;
		this.open = null;
		if (!this.writer) {
			return;
		}

		const lines = rendered.replace(/\n$/, "").split("\n");

		// A pipe or a log file has no width to fit, and `nodeTerminal` reports a
		// nominal 80 columns for one. Going through the live region would clamp
		// the table to that and lose its rightmost columns to an ellipsis.
		if (!isRedrawable(this.terminal)) {
			await this.writer.write(`${lines.join("\n")}\n`);
			return;
		}

		await this.writer.write(this.region([], lines));
	}

	private async redraw(): Promise<void> {
		if (!this.writer || !isRedrawable(this.terminal)) {
			return;
		}

		await this.writer.write(this.region(this.buildLiveLines()));
	}

	/** One final table recapping every diagnostic and load error, if any. */
	private buildFinalRecap(): string[] {
		const lines: string[] = [];

		const rows = [...this.diagnostics.values()]
			.sort(
				(left, right) =>
					SEVERITY_ORDER.indexOf(left.severity) -
						SEVERITY_ORDER.indexOf(right.severity) ||
					left.condition.localeCompare(right.condition),
			)
			.map((record) => [
				record.condition,
				record.case,
				record.severity,
				record.count > 1
					? `${record.detail} (${record.count} times)`
					: record.detail,
			]);

		if (rows.length > 0) {
			lines.push(
				"",
				renderTable(
					dataFrameFromRows(
						[
							{ name: "condition", kind: "nominal" },
							{ name: "case", kind: "nominal" },
							{ name: "severity", kind: "nominal" },
							{ name: "detail", kind: "nominal" },
						],
						rows,
						{ title: "Warnings" },
					),
				),
			);
		}

		if (this.loadErrors.length > 0) {
			lines.push(
				"",
				"Load errors:",
				...this.loadErrors.map((error) => `  ${error.file}: ${error.message}`),
			);
		}

		if (this.runDiagnostics.length > 0) {
			lines.push(
				"",
				"Notes:",
				...this.runDiagnostics.map((diagnostic) => `  ${diagnostic.message}`),
			);
		}

		return lines;
	}
}
