import { describe, expect, it } from "vitest";

import type { DataValue } from "./ast.js";
import { CborWalkStop, walkDataValue } from "./walk.js";

describe("walkDataValue", () => {
	it("visits array items in order", () => {
		const value: DataValue = {
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{ kind: "int", value: 2n },
			],
		};
		const kinds: string[] = [];
		walkDataValue(value, (node) => {
			kinds.push(node.kind);
		});
		expect(kinds).toEqual(["array", "int", "int"]);
	});

	it("visits a map's flattened key/value pairs", () => {
		const value: DataValue = {
			kind: "map",
			entries: [
				[
					{ kind: "text", value: "a" },
					{ kind: "int", value: 1n },
				],
			],
		};
		const kinds: string[] = [];
		walkDataValue(value, (node) => {
			kinds.push(node.kind);
		});
		expect(kinds).toEqual(["map", "text", "int"]);
	});

	it("visits a tag's wrapped value", () => {
		const value: DataValue = {
			kind: "tag",
			tag: 0n,
			value: { kind: "text", value: "x" },
		};
		const kinds: string[] = [];
		walkDataValue(value, (node) => {
			kinds.push(node.kind);
		});
		expect(kinds).toEqual(["tag", "text"]);
	});

	it("stops early on WalkStop", () => {
		const value: DataValue = {
			kind: "array",
			items: [
				{ kind: "int", value: 1n },
				{ kind: "int", value: 2n },
			],
		};
		const kinds: string[] = [];
		const stopped = walkDataValue(value, (node) => {
			kinds.push(node.kind);
			return kinds.length === 2 ? CborWalkStop : undefined;
		});
		expect(stopped).toBe(true);
		expect(kinds).toEqual(["array", "int"]);
	});
});
