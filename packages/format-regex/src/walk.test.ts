import { describe, expect, it } from "vitest";

import { parseRegex } from "./parser.js";
import { RegexWalkStop, walkRegex } from "./walk.js";

describe("walkRegex", () => {
	it("visits every node in pre-order", () => {
		const pattern = parseRegex("a(b|c)*");
		const kinds: string[] = [];
		walkRegex(pattern.body, (node) => {
			kinds.push(node.kind);
		});
		expect(kinds).toEqual([
			"concat",
			"literal",
			"quantified",
			"group",
			"alternation",
			"literal",
			"literal",
		]);
	});

	it("stops early on WalkStop", () => {
		const pattern = parseRegex("abc");
		const kinds: string[] = [];
		const stopped = walkRegex(pattern.body, (node) => {
			kinds.push(node.kind);
			return kinds.length === 2 ? RegexWalkStop : undefined;
		});
		expect(stopped).toBe(true);
		expect(kinds).toEqual(["concat", "literal"]);
	});
});
