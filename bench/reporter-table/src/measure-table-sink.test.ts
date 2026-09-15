import type {
	MeasureCaseExecution,
	MeasureCaseResult,
	MeasurePluginSpec,
} from "@ac-bench/core/plugin";
import { defineMeasurePlugin, MeasureRegistry } from "@ac-bench/core/plugin";
import type { Terminal } from "@ac-kit/app-terminal";
import { VoidEvent } from "@ac-kit/async";
import type { FieldDescriptor } from "@ac-kit/model-dataset";
import { DIMENSIONLESS } from "@ac-kit/model-dataset";
import { describe, expect, it, vi } from "vitest";

import { MeasureTableSink } from "./measure-table-sink.js";

const NEUTRAL_FIELDS: readonly FieldDescriptor[] = [
	{ name: "name", kind: "nominal", title: "case" },
	{
		name: "value",
		kind: "quantitative",
		title: "value",
		unit: DIMENSIONLESS,
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
];

const DIRECTED_FIELDS: readonly FieldDescriptor[] = [
	{ name: "name", kind: "nominal", title: "case" },
	{
		name: "value",
		kind: "quantitative",
		title: "value",
		unit: DIMENSIONLESS,
		direction: "lower-is-better",
		format: { minimumFractionDigits: 3, maximumFractionDigits: 3 },
	},
];

type FakeCase = {
	name: string;
	value: number;
	/** Half-width of the interval around `value`. */
	spread?: number;
	failed?: boolean;
};
type FakeCondition = { title: string; cases: readonly FakeCase[] };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

const fakeSpec: MeasurePluginSpec<FakeCase, FakeCondition> = {
	id: "duration",
	label: "Fake duration",
	parseCaseResult: (value) => {
		if (!isRecord(value) || typeof value["name"] !== "string") {
			throw new TypeError("expected a FakeCase");
		}
		return value as unknown as FakeCase;
	},
	parseConditionResult: (value) => {
		if (!isRecord(value) || !Array.isArray(value["results"])) {
			throw new TypeError("expected a FakeCondition");
		}
		return {
			title: String(value["title"]),
			cases: value["results"] as FakeCase[],
		};
	},
	fields: NEUTRAL_FIELDS,
	caseRow: (result) =>
		result.failed
			? [`${result.name} (FAILED)`, null]
			: [result.name, result.value],
	comparison: { field: "value" },
	warnings: (result) =>
		result.value < 0
			? [{ severity: "warning", code: "negative", message: "negative value" }]
			: [],
	pool: (executions) => executions[0]!.result,
	scheduling: { rounds: "many", grouping: "condition" },
	toJsonCase: (result) => result,
	toJsonCondition: (result) => result,
};

function buildRegistry(): MeasureRegistry {
	const registry = new MeasureRegistry();
	registry.register(defineMeasurePlugin(fakeSpec));
	return registry;
}

/**
 * Same shape as `fakeSpec`, but `"lower-is-better"` — for the trend-arrow
 * tests.
 */
function buildDurationLikeRegistry(): MeasureRegistry {
	const registry = new MeasureRegistry();
	registry.register(
		defineMeasurePlugin({ ...fakeSpec, fields: DIRECTED_FIELDS }),
	);
	return registry;
}

/** Reports an interval, which is what the trend arrow needs to see a change. */
function buildBoundedRegistry(): MeasureRegistry {
	const registry = new MeasureRegistry();
	registry.register(
		defineMeasurePlugin({
			...fakeSpec,
			fields: [
				...DIRECTED_FIELDS,
				{ name: "lower", kind: "quantitative", title: "low" },
				{ name: "upper", kind: "quantitative", title: "high" },
			],
			caseRow: (result) => {
				const spread = result.spread ?? 0.1;
				return [
					result.name,
					result.value,
					result.value - spread,
					result.value + spread,
				];
			},
			comparison: {
				field: "value",
				interval: ["lower", "upper"],
			},
		}),
	);
	return registry;
}

function terminal(overrides?: Partial<Terminal>): Terminal {
	return {
		interactive: true,
		columns: 80,
		rows: 24,
		colorDepth: 4,
		unicode: true,
		hyperlinks: false,
		resize: new VoidEvent(),
		...overrides,
	};
}

function collectingStream(chunks: string[]): WritableStream<string> {
	return new WritableStream<string>({
		write(chunk) {
			chunks.push(chunk);
		},
	});
}

/** The sink under test, collecting into `chunks`. A table writes no files. */
function tableSink(
	chunks: string[],
	terminalOverrides?: Partial<Terminal>,
	registry: MeasureRegistry = buildRegistry(),
): MeasureTableSink {
	return new MeasureTableSink({
		registry,
		terminal: terminal(terminalOverrides),
		defaultOutput: "bench-results",
		stdout: collectingStream(chunks),
		openOutput: () => {
			throw new Error("the table reporter writes no files");
		},
	});
}

type ReportEventFor = Parameters<MeasureTableSink["write"]>[0];

function conditionStart(id: string, title: string): ReportEventFor {
	return {
		kind: "scope-start",
		timestamp: 0,
		scopeId: id,
		parentId: null,
		title,
		key: title,
		attributes: { conditionMeasure: "duration" },
	};
}

function caseStart(
	conditionId: string,
	id: string,
	name: string,
	index?: number,
): ReportEventFor {
	return {
		kind: "scope-start",
		timestamp: 0,
		scopeId: id,
		parentId: conditionId,
		title: name,
		key: `${conditionId} > ${name}`,
		attributes:
			index === undefined
				? { benchCase: name }
				: { benchCase: name, benchCaseIndex: index },
	};
}

/** What one process measured, which is what the live table fills from. */
function caseExecutionData(caseId: string, result: FakeCase): ReportEventFor {
	const data: MeasureCaseExecution = {
		kind: "case-execution",
		measure: "duration",
		caseTitle: result.name,
		arm: "shared",
		replicate: 0,
		result,
	};
	return { kind: "data", timestamp: 0, scopeId: caseId, data };
}

/** The pooled answer the parent emits, which is what the final table shows. */
function caseResultData(conditionId: string, result: FakeCase): ReportEventFor {
	const data: MeasureCaseResult = {
		kind: "case-result",
		measure: "duration",
		caseTitle: result.name,
		result,
	};
	return { kind: "data", timestamp: 0, scopeId: conditionId, data };
}

function scopeEnd(id: string): ReportEventFor {
	return {
		kind: "scope-end",
		timestamp: 0,
		scopeId: id,
		status: "ok",
		durationMs: 1,
	};
}

function diagnostic(
	severity: "info" | "warning" | "error",
	message: string,
): ReportEventFor {
	return { kind: "diagnostic", timestamp: 0, scopeId: null, severity, message };
}

/** What `createMeasureDiagnosticProxy` emits for a case's typed warnings. */
function caseDiagnostic(
	conditionId: string,
	caseTitle: string,
	severity: "info" | "warning" | "error",
	message: string,
): ReportEventFor {
	return {
		kind: "diagnostic",
		timestamp: 0,
		scopeId: conditionId,
		severity,
		message,
		attributes: { "bench.case": caseTitle },
	};
}

describe("MeasureTableSink (non-interactive)", () => {
	it("writes the finished table once the condition ends", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseResultData("c1", { name: "fast", value: 1 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("fast");
		expect(rendered).not.toContain("\u001B[");
	});

	// Several processes measure the same case, so rendering the executions would
	// show that case once per process, each with a different number.
	it("commits the pooled answer rather than the executions behind it", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseStart("s1", "c1", "fast"));
		sink.write(caseExecutionData("c1", { name: "fast", value: 1 }));
		sink.write(scopeEnd("c1"));
		sink.write(caseStart("s1", "c2", "fast"));
		sink.write(caseExecutionData("c2", { name: "fast", value: 3 }));
		sink.write(scopeEnd("c2"));
		sink.write(caseResultData("s1", { name: "fast", value: 2 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toMatch(/^fast\s+2\.000$/m);
		expect(rendered).not.toMatch(/^fast\s+3\.000$/m);
	});

	it("orders rows by declared position, not by finish order", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(conditionStart("s1", "my condition"));
		// Declared first (index 0), finishes second.
		sink.write(caseStart("s1", "c1", "first", 0));
		// Declared second (index 1), finishes first.
		sink.write(caseStart("s1", "c2", "second", 1));
		sink.write(caseResultData("s1", { name: "second", value: 2 }));
		sink.write(scopeEnd("c2"));
		sink.write(caseResultData("s1", { name: "first", value: 1 }));
		sink.write(scopeEnd("c1"));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered.indexOf("first")).toBeLessThan(rendered.indexOf("second"));
	});

	it("truncates a styled row without corrupting its escape sequences", async () => {
		const chunks: string[] = [];
		// Interactive: styling is applied and the region clamps to the width.
		const sink = tableSink(chunks, { interactive: true, columns: 20 });

		sink.write(conditionStart("s1", "my condition"));
		sink.write(
			caseResultData("s1", {
				name: "a case name long enough to overflow twenty columns",
				value: -1,
			}),
		);
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		// A cut landing inside an SGR sequence strips only the ESC byte, leaving
		// its raw digits ("38;2;...m") behind as literal text.
		// oxlint-disable-next-line no-control-regex
		expect(rendered).not.toMatch(/(?<!\u001B\[)\d+;\d+;\d+;\d+m/);
	});

	it("keeps the full table width when the terminal is not redrawable", async () => {
		const chunks: string[] = [];
		// What a pipe reports: not interactive, and a nominal width that is not a
		// real constraint.
		const sink = tableSink(chunks, { interactive: false, columns: 20 });
		const name = "a case name long enough to overflow twenty columns";

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseResultData("s1", { name, value: -1 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain(name);
		expect(rendered).not.toContain("…");
	});

	it("writes a load-error message immediately", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write({
			kind: "data",
			timestamp: 0,
			scopeId: null,
			data: { kind: "load-error", file: "broken.bench.ts", message: "boom" },
		});
		await sink.close();

		expect(chunks.join("")).toContain("broken.bench.ts");
	});

	it("writes a diagnostic immediately and do not recaps it at close", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(
			diagnostic("info", "waiting for the machine to settle before measuring"),
		);
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("waiting for the machine to settle");
		expect(rendered).not.toContain("Notes:");
	});

	it("marks the best case with a winner glyph and leaves the rest unmarked", async () => {
		const chunks: string[] = [];
		const sink = tableSink(
			chunks,
			{ interactive: false },
			buildDurationLikeRegistry(),
		);

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseResultData("s1", { name: "fast", value: 1 }));
		sink.write(caseResultData("s1", { name: "mid", value: 5 }));
		sink.write(caseResultData("s1", { name: "slow", value: 9 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		// Lower is better, and only the winner is marked — no medals.
		expect(rendered).toMatch(/^★\s+fast/m);
		expect(rendered.match(/★/g) ?? []).toHaveLength(1);
	});

	// Every annotation column is empty on a clean run, and an all-null column is
	// noise rather than information.
	it("shows no annotation columns when nothing went wrong", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseResultData("s1", { name: "fast", value: 1 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).not.toContain("⚠");
		expect(rendered).not.toContain("in progress");
	});

	it("flags a case whose result carries a warning, without tinting the row", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks, { interactive: false });

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseResultData("s1", { name: "flaky", value: -1 }));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("⚠");
		expect(rendered).toMatch(/^flaky\s.*⚠\s+see notes$/m);
	});
});

describe("MeasureTableSink (interactive)", () => {
	it("shows a preparing line once a condition starts", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			await vi.advanceTimersByTimeAsync(150);

			expect(chunks.join("")).toContain("preparing");
		} finally {
			vi.useRealTimers();
		}
	});

	it("shows a pending row with the case's name once it starts", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl"));
			await vi.advanceTimersByTimeAsync(150);

			expect(chunks.join("")).toContain("fast impl");
		} finally {
			vi.useRealTimers();
		}
	});

	it("replaces the pending row with real numbers once the case finishes", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl"));
			await vi.advanceTimersByTimeAsync(150);
			chunks.length = 0;

			sink.write(caseExecutionData("c1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("c1"));
			await vi.advanceTimersByTimeAsync(150);

			expect(chunks.join("")).toContain("1.000");
		} finally {
			vi.useRealTimers();
		}
	});

	it("dims a case's row while its answer is a raw execution, not yet pooled", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl"));
			sink.write(caseExecutionData("c1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("c1"));
			chunks.length = 0;
			await vi.advanceTimersByTimeAsync(150);

			// oxlint-disable-next-line no-control-regex
			expect(chunks.join("")).toMatch(/\u001B\[.*fast impl/);
		} finally {
			vi.useRealTimers();
		}
	});

	it("rewrites the same row in place when the pooled answer replaces the raw execution", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl"));
			sink.write(caseExecutionData("c1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("c1"));
			await vi.advanceTimersByTimeAsync(150);
			chunks.length = 0;

			sink.write(caseResultData("s1", { name: "fast impl", value: 1 }));
			await vi.advanceTimersByTimeAsync(150);

			// Each redraw is one full write of the live region: whichever tick fired
			// last, it shows the row exactly once, never once per prior state.
			const lastRedraw = chunks.at(-1) ?? "";
			expect(lastRedraw.match(/fast impl/g) ?? []).toHaveLength(1);
		} finally {
			vi.useRealTimers();
		}
	});

	// The live table and the committed one differ in width and in line count, so
	// the only thing keeping the old header off the screen is the erase counting
	// exactly the rows that were written. A short count strands the previous
	// header in scrollback.
	it("erases exactly as many rows as the live region last wrote", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks, undefined, buildDurationLikeRegistry());

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl", 0));
			sink.write(caseExecutionData("c1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("c1"));
			await vi.advanceTimersByTimeAsync(150);

			const lastLive = chunks.at(-1) ?? "";
			chunks.length = 0;

			sink.write(caseResultData("s1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("s1"));
			await vi.advanceTimersByTimeAsync(0);

			const written = (lastLive.match(/\n/g) ?? []).length;
			expect(chunks[0]).toMatch(new RegExp(`^\u001B\\[${written}A\u001B\\[0J`));
		} finally {
			vi.useRealTimers();
		}
	});

	// The arrow reports a case against its own previous answer, so it needs two
	// executions and a measure that bounds them.
	it("draws a trend arrow once a case's interval clears its previous one", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks, undefined, buildBoundedRegistry());

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "impl", 0));
			sink.write(caseExecutionData("c1", { name: "impl", value: 5 }));
			sink.write(scopeEnd("c1"));
			sink.write(caseExecutionData("c1", { name: "impl", value: 1 }));
			chunks.length = 0;
			await vi.advanceTimersByTimeAsync(150);

			// Lower is better and [0.9, 1.1] clears [4.9, 5.1] entirely.
			expect(chunks.at(-1) ?? "").toContain("▼");
		} finally {
			vi.useRealTimers();
		}
	});

	it("draws no arrow while the two intervals still overlap", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks, undefined, buildBoundedRegistry());

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "impl", 0));
			sink.write(
				caseExecutionData("c1", { name: "impl", value: 5, spread: 0.5 }),
			);
			sink.write(scopeEnd("c1"));
			sink.write(
				caseExecutionData("c1", { name: "impl", value: 4.6, spread: 0.5 }),
			);
			chunks.length = 0;
			await vi.advanceTimersByTimeAsync(150);

			// [4.1, 5.1] against [4.5, 5.5]: a difference inside the noise floor.
			const rendered = chunks.at(-1) ?? "";
			expect(rendered).not.toContain("▼");
			expect(rendered).not.toContain("▲");
		} finally {
			vi.useRealTimers();
		}
	});

	it("commits the finished table to scrollback when the condition ends", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(conditionStart("s1", "my condition"));
			sink.write(caseStart("s1", "c1", "fast impl"));
			sink.write(caseResultData("c1", { name: "fast impl", value: 1 }));
			sink.write(scopeEnd("c1"));
			chunks.length = 0;
			sink.write(scopeEnd("s1"));
			await vi.advanceTimersByTimeAsync(150);

			const rendered = chunks.join("");
			expect(rendered).toContain("fast impl");

			chunks.length = 0;
			await vi.advanceTimersByTimeAsync(150);
			expect(chunks.join("")).toBe("");
		} finally {
			vi.useRealTimers();
		}
	});

	it("shows a status line for a diagnostic while nothing else is happening", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(
				diagnostic(
					"info",
					"waiting for the machine to settle before measuring",
				),
			);
			await vi.advanceTimersByTimeAsync(150);

			expect(chunks.join("")).toContain("waiting for the machine to settle");
		} finally {
			vi.useRealTimers();
		}
	});

	it("clears the status line once a condition actually starts", async () => {
		vi.useFakeTimers();
		try {
			const chunks: string[] = [];
			const sink = tableSink(chunks);

			sink.write(diagnostic("info", "cooling down"));
			sink.write(conditionStart("s1", "my condition"));
			chunks.length = 0;
			await vi.advanceTimersByTimeAsync(150);

			expect(chunks.join("")).not.toContain("cooling down");
		} finally {
			vi.useRealTimers();
		}
	});

	it("close() recaps every diagnostic and load error observed across the run", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks);

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseStart("s1", "c1", "flaky"));
		sink.write(caseExecutionData("c1", { name: "flaky", value: -1 }));
		sink.write(scopeEnd("c1"));
		sink.write(caseDiagnostic("s1", "flaky", "warning", "negative value"));
		sink.write(scopeEnd("s1"));
		sink.write({
			kind: "data",
			timestamp: 0,
			scopeId: null,
			data: { kind: "load-error", file: "broken.bench.ts", message: "boom" },
		});

		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("negative value");
		expect(rendered).toContain("broken.bench.ts");
	});

	it("files a condition's diagnostic next to its case, with its severity", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks);

		sink.write(conditionStart("s1", "my condition"));
		sink.write(caseDiagnostic("s1", "flaky", "warning", "negative value"));
		sink.write(scopeEnd("s1"));
		await sink.close();

		const recap = chunks.join("").slice(chunks.join("").indexOf("Warnings"));
		expect(recap).toContain("my condition");
		expect(recap).toContain("flaky");
		expect(recap).toContain("warning");
	});

	it("counts a diagnostic repeated across executions as one finding", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks);

		sink.write(conditionStart("s1", "my condition"));
		for (let execution = 0; execution < 4; execution++) {
			sink.write({
				kind: "diagnostic",
				timestamp: 0,
				scopeId: "s1",
				severity: "error",
				message: "<ChildExitedError> child was killed with SIGKILL",
			});
		}
		sink.write(scopeEnd("s1"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("(4 times)");
		expect(rendered.match(/SIGKILL/g)).toHaveLength(1);
	});

	it("keeps a diagnostic raised outside any condition in the notes", async () => {
		const chunks: string[] = [];
		const sink = tableSink(chunks);

		sink.write(diagnostic("warning", "the run was stopped after its budget"));
		await sink.close();

		const rendered = chunks.join("");
		expect(rendered).toContain("Notes:");
		expect(rendered).toContain("the run was stopped after its budget");
	});
});

/** Every SGR-wrapped run in the output, as its codes and the text they cover. */
function styledCells(rendered: string): { codes: string; text: string }[] {
	// oxlint-disable-next-line no-control-regex -- matching the ESC that opens an SGR sequence is the point of this pattern
	const sgr = /\u001B\[([\d;]*)m([^\u001B]*)\u001B\[0m/g;
	return [...rendered.matchAll(sgr)].map((match) => ({
		codes: match[1] ?? "",
		text: (match[2] ?? "").trim(),
	}));
}

function cellCodes(rendered: string, text: string): string[] {
	return styledCells(rendered)
		.filter((cell) => cell.text === text)
		.map((cell) => cell.codes);
}

describe("MeasureTableSink (colour)", () => {
	/** Declares a dimensionless ratio column, which is what carries the colour. */
	function buildRatioRegistry(): MeasureRegistry {
		const registry = new MeasureRegistry();
		registry.register(
			defineMeasurePlugin({
				...fakeSpec,
				fields: [
					...DIRECTED_FIELDS,
					{
						name: "ratio",
						kind: "quantitative",
						title: "rel",
						direction: "lower-is-better",
						uncertaintyField: "margin",
						format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
					},
					{
						name: "margin",
						kind: "quantitative",
						title: "margin",
						format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
					},
				],
				caseRow: (result) => [result.name, result.value, result.value, 0.5],
				comparison: { field: "value", ratioField: "ratio" },
			}),
		);
		return registry;
	}

	async function renderRatios(
		ratios: readonly number[],
		overrides?: Partial<Terminal>,
	): Promise<string> {
		const chunks: string[] = [];
		const sink = tableSink(
			chunks,
			{ colorDepth: 24, ...overrides },
			buildRatioRegistry(),
		);

		sink.write(conditionStart("s1", "my condition"));
		for (const [index, value] of ratios.entries()) {
			sink.write(caseResultData("s1", { name: `c${index}`, value }));
		}
		sink.write(scopeEnd("s1"));
		await sink.close();
		return chunks.join("");
	}

	it("tints the ratio column and leaves the quantity it ranks on alone", async () => {
		const rendered = await renderRatios([1, 4]);

		expect(cellCodes(rendered, "4.00")).toEqual([
			expect.stringMatching(/^38;2;\d+;\d+;\d+$/),
		]);
		// The same number as a timing: ranked on, never tinted.
		expect(cellCodes(rendered, "4.000")).toEqual([]);
	});

	it("gives a margin the colour of the ratio it qualifies", async () => {
		const rendered = await renderRatios([1, 4]);
		const [ratio] = cellCodes(rendered, "4.00");
		const margins = cellCodes(rendered, "0.50");

		expect(margins).toHaveLength(2);
		expect(margins).toContain(ratio);
	});

	it("moves further along the ramp the further a row is from the anchor", async () => {
		const rendered = await renderRatios([1, 2, 8]);
		const near = cellCodes(rendered, "2.00")[0] ?? "";
		const far = cellCodes(rendered, "8.00")[0] ?? "";

		const redness = (codes: string) => {
			const [, , red = "0", green = "0"] = codes.split(";");
			return Number(red) - Number(green);
		};
		expect(redness(far)).toBeGreaterThan(redness(near));
	});

	it("emphasises the winner's ranked quantity and nothing else's", async () => {
		const rendered = await renderRatios([1, 4]);

		expect(cellCodes(rendered, "1.000")).toEqual(["1"]);
	});

	it("colours nothing when every row sits at the anchor", async () => {
		const rendered = await renderRatios([1, 1]);

		expect(cellCodes(rendered, "1.00")).toEqual([]);
		expect(cellCodes(rendered, "0.50")).toEqual([]);
	});

	it("writes no escape sequences at all when the terminal is not one", async () => {
		const rendered = await renderRatios([1, 4], {
			interactive: false,
			colorDepth: 1,
		});

		expect(rendered).not.toContain("\u001B[");
	});
});
