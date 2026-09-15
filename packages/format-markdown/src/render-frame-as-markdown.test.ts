import type { DataFrame } from "@ac-kit/model-dataset";
import { dataFrameFromRows } from "@ac-kit/model-dataset";
import { expect, suite, test } from "vitest";

import { renderFrameAsMarkdown } from "./render-frame-as-markdown.js";

function sampleFrame(meta?: DataFrame["meta"]): DataFrame {
	return dataFrameFromRows(
		[
			{ name: "name", kind: "nominal", title: "Name" },
			{ name: "value", kind: "quantitative", title: "Value" },
		],
		[
			["alpha", 1],
			["beta", null],
		],
		meta,
	);
}

suite("renderFrameAsMarkdown", () => {
	test("renders header, alignment delimiter row and body rows", () => {
		expect(renderFrameAsMarkdown(sampleFrame())).toBe(
			[
				"| Name | Value |",
				"| :-- | --: |",
				"| alpha | 1 |",
				"| beta |  |",
			].join("\n"),
		);
	});

	test("omits alignment colons when alignment is false", () => {
		const lines = renderFrameAsMarkdown(sampleFrame(), {
			alignment: false,
		}).split("\n");
		expect(lines[1]).toBe("| --- | --- |");
	});

	test("escapes a literal pipe in cell content", () => {
		const piped = dataFrameFromRows(
			[{ name: "a", kind: "nominal", title: "A" }],
			[["a|b"]],
		);
		expect(renderFrameAsMarkdown(piped)).toContain("a\\|b");
	});

	test("collapses a literal newline in cell content to a space", () => {
		const multiline = dataFrameFromRows(
			[{ name: "a", kind: "nominal", title: "A" }],
			[["a\nb"]],
		);
		expect(renderFrameAsMarkdown(multiline)).toContain("a b");
	});

	test("renders the frame title as a heading above the table", () => {
		expect(
			renderFrameAsMarkdown(sampleFrame({ title: "Results" })).startsWith(
				"# Results\n\n",
			),
		).toBe(true);
	});

	test("renders frame footnotes below the table", () => {
		expect(
			renderFrameAsMarkdown(
				sampleFrame({ footnotes: ["* estimated"] }),
			).endsWith("\n\n* estimated"),
		).toBe(true);
	});
});
