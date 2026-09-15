import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { renderTable } from "./render-table.js";

function sampleFrame(meta?: DataFrame["meta"]): DataFrame {
	return dataFrameFromRows(
		[
			{ name: "name", kind: "nominal", title: "Name" },
			{ name: "value", kind: "quantitative", title: "Value" },
		],
		[
			["alpha", 1],
			["beta", 20],
		],
		meta,
	);
}

const FRAME = sampleFrame({ title: "Results", footnotes: ["* estimated"] });

suite("renderTable", () => {
	test("renders title, header and rows with no border", () => {
		expect(renderTable(FRAME)).toBe(
			[
				"Results",
				"Name   Value",
				"alpha      1",
				"beta      20",
				"* estimated",
			].join("\n"),
		);
	});

	test("omits the title line when absent", () => {
		expect(renderTable(sampleFrame()).startsWith("Name")).toBe(true);
	});

	test("ascii border adds edges and a header rule", () => {
		const lines = renderTable(FRAME, { border: "ascii" }).split("\n");
		expect(lines[1]).toBe("| Name  | Value |");
		expect(lines[2]).toBe("+-------+-------+");
	});

	test("markdown-like border emits a GFM alignment delimiter row", () => {
		const lines = renderTable(FRAME, { border: "markdown-like" }).split("\n");
		expect(lines[1]).toBe("| Name  | Value |");
		expect(lines[2]).toBe("| :---- | ----: |");
	});

	test("styleHeader is applied only to the header row", () => {
		const rendered = renderTable(FRAME, {
			styleHeader: (text) => `H(${text})`,
		});
		expect(rendered).toContain("H(Name )");
		expect(rendered).not.toContain("H(alpha");
	});
});
