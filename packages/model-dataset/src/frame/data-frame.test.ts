import { expect, suite, test } from "vitest";

import { dataFrameDropEmptyFields, dataFrameFromRows } from "./data-frame.js";
import type { FieldDescriptor } from "./field.js";

const FIELDS: readonly FieldDescriptor[] = [
	{ name: "case", kind: "nominal" },
	{ name: "median", kind: "quantitative" },
	{ name: "adjusted", kind: "quantitative" },
	{ name: "status", kind: "nominal" },
];

suite("dataFrameDropEmptyFields", () => {
	test("drops the fields whose every cell is null", () => {
		const frame = dataFrameDropEmptyFields(
			dataFrameFromRows(FIELDS, [
				["alpha", 1, null, null],
				["beta", 2, null, null],
			]),
		);
		expect(frame.fields.map((field) => field.name)).toEqual(["case", "median"]);
		expect(frame.columns).toHaveLength(2);
		expect(frame.rowCount).toBe(2);
	});

	test("keeps a field holding a single non-null cell", () => {
		const frame = dataFrameDropEmptyFields(
			dataFrameFromRows(FIELDS, [
				["alpha", 1, null, null],
				["beta", 2, null, "failed"],
			]),
		);
		expect(frame.fields.map((field) => field.name)).toEqual([
			"case",
			"median",
			"status",
		]);
	});

	test("keeps a field holding a falsy but present value", () => {
		const frame = dataFrameDropEmptyFields(
			dataFrameFromRows(FIELDS, [["alpha", 0, null, ""]]),
		);
		expect(frame.fields.map((field) => field.name)).toEqual([
			"case",
			"median",
			"status",
		]);
	});

	test("drops every field of an empty frame", () => {
		const frame = dataFrameDropEmptyFields(dataFrameFromRows(FIELDS, []));
		expect(frame.fields).toEqual([]);
		expect(frame.rowCount).toBe(0);
	});

	test("preserves the frame's name and meta", () => {
		const source = dataFrameFromRows(FIELDS, [["alpha", 1, null, null]], {
			title: "Results",
		});
		source.name = "run";
		const frame = dataFrameDropEmptyFields(source);
		expect(frame.name).toBe("run");
		expect(frame.meta).toEqual({ title: "Results" });
	});

	test("shares columns with the source frame rather than copying", () => {
		const source = dataFrameFromRows(FIELDS, [["alpha", 1, null, null]]);
		const frame = dataFrameDropEmptyFields(source);
		expect(frame.columns[0]).toBe(source.columns[0]);
	});
});
