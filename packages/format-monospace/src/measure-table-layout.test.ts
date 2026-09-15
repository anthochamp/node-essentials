import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { measureTableLayout } from "./measure-table-layout.js";

suite("measureTableLayout", () => {
	test("uses the widest of header and body cells per column", () => {
		const frame = dataFrameFromRows(
			[{ name: "name", kind: "nominal", title: "Name" }],
			[["a"], ["longer-name"]],
		);

		expect(measureTableLayout(frame)).toEqual([11]);
	});

	test("counts wide characters as two columns", () => {
		const frame = dataFrameFromRows(
			[{ name: "label", kind: "nominal", title: "x" }],
			[["中文"]],
		);

		expect(measureTableLayout(frame)).toEqual([4]);
	});

	test("caps a column at its maxWidth, including the ellipsis", () => {
		const frame = dataFrameFromRows(
			[{ name: "label", kind: "nominal", title: "x" }],
			[["this is a long value"]],
		);

		expect(measureTableLayout(frame, { maxWidth: { label: 5 } })).toEqual([5]);
	});

	test("renders null cells as nullText for width purposes", () => {
		const frame = dataFrameFromRows(
			[{ name: "label", kind: "nominal", title: "x" }],
			[[null]],
		);

		expect(measureTableLayout(frame, { nullText: "N/A" })).toEqual([3]);
	});
});
