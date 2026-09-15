import { expect, suite, test } from "vitest";

import type { FieldDescriptor } from "./field.js";
import { createFieldFormatter } from "./format-field.js";

const MARGIN: FieldDescriptor = {
	name: "margin",
	kind: "quantitative",
	prefix: "±",
	format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
};

suite("createFieldFormatter", () => {
	test("wraps the formatted number in the field's affixes", () => {
		expect(createFieldFormatter(MARGIN, { locale: "en-US" })(1.5)).toBe(
			"±1.50",
		);
	});

	test("applies a suffix", () => {
		const ratio: FieldDescriptor = {
			name: "ratio",
			kind: "quantitative",
			suffix: "×",
			format: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
		};
		expect(createFieldFormatter(ratio, { locale: "en-US" })(1.55)).toBe(
			"1.55×",
		);
	});

	test("leaves a null cell's placeholder unaffixed", () => {
		const format = createFieldFormatter(MARGIN, {
			locale: "en-US",
			nullText: "—",
		});
		expect(format(null)).toBe("—");
	});

	test("affixes a categorical field the same way", () => {
		const field: FieldDescriptor = {
			name: "case",
			kind: "nominal",
			prefix: "[",
			suffix: "]",
		};
		expect(createFieldFormatter(field)("alpha")).toBe("[alpha]");
	});

	test("formats without affixes when the field declares none", () => {
		const field: FieldDescriptor = { name: "case", kind: "nominal" };
		expect(createFieldFormatter(field)("alpha")).toBe("alpha");
	});
});
