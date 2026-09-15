import { describe, expect, it } from "vitest";

import {
	DataFrameColumnShapeError,
	dataFrameFromColumns,
} from "./data-frame.js";
import type { FieldDescriptor } from "./field.js";

const FIELDS: FieldDescriptor[] = [
	{ name: "x", kind: "quantitative" },
	{ name: "label", kind: "nominal" },
];

describe("dataFrameFromColumns", () => {
	it("derives the row count from the columns", () => {
		const frame = dataFrameFromColumns(FIELDS, [
			Float64Array.from([1, 2, 3]),
			["a", "b", "c"],
		]);

		expect(frame.rowCount).toBe(3);
		expect(frame.fields).toHaveLength(2);
	});

	it("stores a typed-array column by reference rather than repacking it", () => {
		const column = Float64Array.from([1, 2, 3]);
		const frame = dataFrameFromColumns(FIELDS, [column, ["a", "b", "c"]]);

		expect(frame.columns[0]).toBe(column);
	});

	it("copies the field and column lists so later mutation cannot corrupt it", () => {
		const fields = [...FIELDS];
		const columns = [Float64Array.from([1]), ["a"]];
		const frame = dataFrameFromColumns(fields, columns);

		fields.pop();
		columns.pop();

		expect(frame.fields).toHaveLength(2);
		expect(frame.columns).toHaveLength(2);
	});

	it("attaches meta only when given", () => {
		expect(
			dataFrameFromColumns(FIELDS, [Float64Array.from([1]), ["a"]]),
		).not.toHaveProperty("meta");
		expect(
			dataFrameFromColumns(FIELDS, [Float64Array.from([1]), ["a"]], {
				title: "t",
			}),
		).toHaveProperty("meta.title", "t");
	});

	it("accepts an empty frame", () => {
		expect(dataFrameFromColumns([], [])).toHaveProperty("rowCount", 0);
	});

	it("rejects a column count that differs from the field count", () => {
		expect(() =>
			dataFrameFromColumns(FIELDS, [Float64Array.from([1, 2])]),
		).toThrow(DataFrameColumnShapeError);
	});

	it("rejects columns of unequal length", () => {
		expect(() =>
			dataFrameFromColumns(FIELDS, [Float64Array.from([1, 2]), ["a"]]),
		).toThrow(DataFrameColumnShapeError);
	});
});
