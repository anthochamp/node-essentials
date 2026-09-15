import {
	columnCell,
	dataFrameFromRows,
	dataFrameWithField,
	DIMENSIONLESS,
	getDataFrameColumnByName,
} from "@ac-kit/model-dataset";
import { describe, expect, it } from "vitest";

import type { MeasurePluginSpec } from "./plugin.js";
import { defineMeasurePlugin } from "./plugin.js";

type FakeCase = { name: string; value: number };
type FakeCondition = { title: string; cases: readonly FakeCase[] };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseFakeCase(value: unknown): FakeCase {
	if (
		!isRecord(value) ||
		typeof value["name"] !== "string" ||
		typeof value["value"] !== "number"
	) {
		throw new TypeError(`expected a FakeCase, got ${JSON.stringify(value)}`);
	}
	return value as unknown as FakeCase;
}

const fakeSpec: MeasurePluginSpec<FakeCase, FakeCondition> = {
	id: "fake",
	label: "Fake",

	parseCaseResult: parseFakeCase,
	parseConditionResult: (value) => {
		if (!isRecord(value) || !Array.isArray(value["cases"])) {
			throw new TypeError(
				`expected a FakeCondition, got ${JSON.stringify(value)}`,
			);
		}
		return {
			title: typeof value["title"] === "string" ? value["title"] : "",
			cases: value["cases"].map((c) => parseFakeCase(c)),
		};
	},

	fields: [
		{ name: "name", kind: "nominal" },
		{ name: "value", kind: "quantitative", unit: DIMENSIONLESS },
	],
	caseRow: (result) => [result.name, result.value],

	comparison: { field: "value" },

	warnings: (result) =>
		result.value < 0
			? [{ severity: "warning", message: `negative value: ${result.value}` }]
			: [],

	pool: (executions) => executions[0]!.result,
	scheduling: { rounds: "many", grouping: "condition" },

	toJsonCase: (result) => result,
	toJsonCondition: (result) => result,
};

function sampleFrame_() {
	return dataFrameFromRows(fakeSpec.fields, [
		["a", 1],
		["b", 2],
	]);
}

describe("defineMeasurePlugin", () => {
	it("caseRow validates before dispatching", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		expect(plugin.caseRow({ name: "a", value: 1 })).toEqual(["a", 1]);
		expect(() => plugin.caseRow({ name: "a" })).toThrow(TypeError);
	});

	it("deriveFields returns the frame untouched when the spec declares none", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		const frame = sampleFrame_();
		expect(plugin.deriveFields(frame)).toBe(frame);
	});

	it("deriveFields appends the columns the spec derives", () => {
		const plugin = defineMeasurePlugin({
			...fakeSpec,
			deriveFields: (frame) =>
				dataFrameWithField(
					frame,
					{ name: "double", kind: "quantitative" },
					(source, rowIndex) =>
						Number(
							columnCell(getDataFrameColumnByName(source, "value"), rowIndex),
						) * 2,
				),
		});

		const frame = plugin.deriveFields(sampleFrame_());
		expect(getDataFrameColumnByName(frame, "double")).toEqual([2, 4]);
	});

	it("finalizeCondition validates the condition shape before dispatching", () => {
		const plugin = defineMeasurePlugin({
			...fakeSpec,
			finalizeCondition: (frame, condition) => ({
				...frame,
				meta: { ...frame.meta, title: `${condition.title} (final)` },
			}),
		});

		const finalized = plugin.finalizeCondition(sampleFrame_(), {
			title: "s",
			cases: [{ name: "a", value: 1 }],
		});
		expect(finalized.meta?.title).toBe("s (final)");
		expect(() =>
			plugin.finalizeCondition(sampleFrame_(), { title: "s" }),
		).toThrow(TypeError);
	});

	it("finalizeCondition marks a row with what only the measure knows", () => {
		const plugin = defineMeasurePlugin({
			...fakeSpec,
			finalizeCondition: (frame, condition) => ({
				...frame,
				columns: frame.columns.map((column, index) =>
					index === 0
						? Array.from({ length: frame.rowCount }, (_unused, rowIndex) =>
								rowIndex === 0
									? // oxlint-disable-next-line typescript/no-base-to-string typescript/restrict-template-expressions
										`${columnCell(column, rowIndex)} ¹`
									: columnCell(column, rowIndex),
							)
						: column,
				),
				meta: {
					...frame.meta,
					footnotes: [`¹ ${condition.cases.length} case(s) pooled`],
				},
			}),
		});

		const finalized = plugin.finalizeCondition(sampleFrame_(), {
			title: "s",
			cases: [{ name: "a", value: 1 }],
		});
		expect(getDataFrameColumnByName(finalized, "name")).toEqual(["a ¹", "b"]);
		expect(finalized.meta?.footnotes).toEqual(["¹ 1 case(s) pooled"]);
	});

	it("finalizeCondition returns the frame untouched when the spec declares none", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		const frame = sampleFrame_();
		expect(plugin.finalizeCondition(frame, { title: "s", cases: [] })).toBe(
			frame,
		);
	});

	it("preferredView is null when the spec declares none", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		expect(plugin.preferredView(sampleFrame_())).toBeNull();
	});

	it("exposes the comparison the spec declares", () => {
		expect(defineMeasurePlugin(fakeSpec).comparison).toEqual({
			field: "value",
		});
	});

	it("warnings validates the case shape before dispatching", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		expect(plugin.warnings({ name: "a", value: -1 })).toEqual([
			{ severity: "warning", message: "negative value: -1" },
		]);
	});

	it("toJsonCase validates the case shape before dispatching", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		expect(plugin.toJsonCase({ name: "a", value: 1 })).toEqual({
			name: "a",
			value: 1,
		});
		expect(() =>
			plugin.toJsonCase({ title: "s", cases: [{ name: "a", value: 1 }] }),
		).toThrow(TypeError);
	});

	it("toJsonCondition validates the condition shape before dispatching", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		expect(
			plugin.toJsonCondition({ title: "s", cases: [{ name: "a", value: 1 }] }),
		).toEqual({ title: "s", cases: [{ name: "a", value: 1 }] });
		expect(() => plugin.toJsonCondition({ name: "a", value: 1 })).toThrow(
			TypeError,
		);
	});

	it("rejects a foreign payload from a different measure's shape", () => {
		const plugin = defineMeasurePlugin(fakeSpec);
		// Shaped like a duration case result, not a FakeCase.
		expect(() =>
			plugin.caseRow({ name: "a", overheadMs: 0, timings: [] }),
		).toThrow(TypeError);
	});
});
