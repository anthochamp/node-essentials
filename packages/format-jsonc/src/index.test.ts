import { describe, expect, it } from "vitest";

import { createJsoncEdits, editJsonc } from "./edit.js";
import { parseJsonc } from "./parse.js";

describe("parseJsonc", () => {
	it("parses JSON with comments", () => {
		const source = `{
  // comment
  "a": 1,
  "b": 2
}`;
		expect(parseJsonc(source)).toEqual({ a: 1, b: 2 });
	});

	it("parses JSON with trailing commas", () => {
		expect(parseJsonc('{"a":1,}')).toEqual({ a: 1 });
	});
});

describe("editJsonc — high-fidelity", () => {
	it("preserves comments on untouched keys", () => {
		const source = `{
  // keep this comment
  "a": 1,
  "b": 2
}`;
		const result = editJsonc(source, ["b"], 99);
		expect(result).toContain("// keep this comment");
		expect(parseJsonc(result)).toEqual({ a: 1, b: 99 });
	});
});

describe("createJsoncEdits", () => {
	it("returns minimal edits (not full-replace for a simple value change)", () => {
		const source = '{"a":1,"b":2}';
		const edits = createJsoncEdits(source, ["b"], 99);
		// jsonc-parser should only patch the value, not the whole document
		const totalEdited = edits.reduce((acc, e) => acc + e.length, 0);
		expect(totalEdited).toBeLessThan(source.length);
	});
});
