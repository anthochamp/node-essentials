import { describe, expect, it } from "vitest";

import { diagToValue } from "./diag-to-value.js";
import { parseCborNotation } from "./parser.js";

describe("diagToValue", () => {
	it("lowers a parsed tree to a plain DataValue, dropping span and comments", () => {
		const value = diagToValue(parseCborNotation("/note/ [1, 2]"));
		expect(value).toEqual({
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{ kind: "int", value: 2n },
			],
		});
		expect(value).not.toHaveProperty("span");
		expect(value).not.toHaveProperty("leadingComments");
	});

	it("lowers a map's keys and values recursively", () => {
		const value = diagToValue(parseCborNotation('{"a": 1}'));
		expect(value).toEqual({
			kind: "map",
			entries: [
				[
					{ kind: "text", value: "a" },
					{ kind: "int", value: 1n },
				],
			],
		});
	});
});
