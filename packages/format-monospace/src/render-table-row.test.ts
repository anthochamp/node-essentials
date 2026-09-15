import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { renderTableRow } from "./render-table-row.js";
import type { ResolvedColumn } from "./resolve-columns.js";
import { resolveColumns } from "./resolve-columns.js";
import type { RenderTableOptions } from "./types.js";

function resolvedColumns(
	fields: Parameters<typeof dataFrameFromRows>[0],
	options?: RenderTableOptions,
): ResolvedColumn[] {
	return resolveColumns(dataFrameFromRows(fields, []), options);
}

suite("renderTableRow", () => {
	test("left-aligns a category by default", () => {
		const columns = resolvedColumns([
			{ name: "a", kind: "nominal", title: "A" },
		]);
		expect(renderTableRow(["x"], 0, columns, [5])).toBe("x");
	});

	test("right-aligns a quantity without being told to", () => {
		const columns = resolvedColumns([
			{ name: "a", kind: "quantitative", title: "A" },
		]);
		expect(renderTableRow([42], 0, columns, [5])).toBe("   42");
	});

	test("honours an explicit alignment override", () => {
		const columns = resolvedColumns(
			[{ name: "a", kind: "nominal", title: "A" }],
			{ align: { a: "center" } },
		);
		expect(renderTableRow(["x"], 0, columns, [5])).toBe("  x");
	});

	test("renders null as nullText", () => {
		const options: RenderTableOptions = { nullText: "-" };
		const columns = resolvedColumns(
			[{ name: "a", kind: "nominal", title: "A" }],
			options,
		);
		expect(renderTableRow([null], 0, columns, [3], options)).toBe("-");
	});

	test("joins multiple columns with two spaces by default", () => {
		const columns = resolvedColumns([
			{ name: "a", kind: "nominal", title: "A" },
			{ name: "b", kind: "nominal", title: "B" },
		]);
		expect(renderTableRow(["x", "y"], 0, columns, [1, 1])).toBe("x  y");
	});

	test("styleCell receives the padded text and position, applied after padding", () => {
		const columns = resolvedColumns([
			{ name: "a", kind: "nominal", title: "A" },
		]);
		const rendered = renderTableRow(["x"], 0, columns, [3], {
			styleCell: (text, position) =>
				`[${position.field}:${position.column}]${text}`,
		});
		expect(rendered).toBe("[a:0]x");
	});

	test("wraps cells with vertical edges for the ascii border", () => {
		const columns = resolvedColumns([
			{ name: "a", kind: "nominal", title: "A" },
		]);
		expect(renderTableRow(["x"], 0, columns, [1], { border: "ascii" })).toBe(
			"| x |",
		);
	});
});
