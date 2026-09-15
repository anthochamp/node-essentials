import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { renderFrameAsCsv } from "./render-frame-as-csv.js";

const FRAME: DataFrame = dataFrameFromRows(
	[
		{ name: "name", kind: "nominal", title: "Name" },
		{ name: "value", kind: "quantitative", title: "Value" },
	],
	[
		["alpha", 1],
		["beta", null],
	],
);

suite("renderFrameAsCsv", () => {
	test("emits a header row by default", () => {
		expect(renderFrameAsCsv(FRAME)).toBe("Name,Value\r\nalpha,1\r\nbeta,");
	});

	test("omits the header row when header is false", () => {
		expect(renderFrameAsCsv(FRAME, { header: false })).toBe("alpha,1\r\nbeta,");
	});

	test("falls back to the field name when it has no title", () => {
		const frame = dataFrameFromRows(
			[{ name: "raw", kind: "nominal" }],
			[["x"]],
		);
		expect(renderFrameAsCsv(frame)).toBe("raw\r\nx");
	});

	test("applies the field's number format to every cell", () => {
		const frame = dataFrameFromRows(
			[
				{
					name: "ms",
					kind: "quantitative",
					format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
				},
			],
			[[1.5], [2]],
		);
		expect(renderFrameAsCsv(frame, { header: false })).toBe("1.50\r\n2.00");
	});

	test("uses a machine-neutral locale regardless of the ambient one", () => {
		const frame = dataFrameFromRows(
			[{ name: "n", kind: "quantitative" }],
			[[1234.5]],
		);
		expect(renderFrameAsCsv(frame, { header: false })).toBe("1234.5");
	});

	test("honours an explicit locale when the caller asks for one", () => {
		const frame = dataFrameFromRows(
			[{ name: "n", kind: "quantitative" }],
			[[1234.5]],
		);
		expect(renderFrameAsCsv(frame, { header: false, locale: "de-DE" })).toBe(
			'"1234,5"',
		);
	});
});
