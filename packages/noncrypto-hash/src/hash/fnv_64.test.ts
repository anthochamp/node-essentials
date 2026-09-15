import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { fnv1_64, fnv1a_64 } from "./fnv_64.js";

describe("fnv1a_64", () => {
	it.each([
		["", 0xcbf29ce484222325n],
		["a", 0xaf63dc4c8601ec8cn],
		["foobar", 0x85944171f73967e8n],
	])("should match the reference digest of %j", (text, expected) => {
		expect(fnv1a_64(encodeTextUtf8(text))).toBe(expected);
	});
});

describe("fnv1_64", () => {
	it.each([
		["", 0xcbf29ce484222325n],
		["a", 0xaf63bd4c8601b7ben],
		["foobar", 0x340d8765a4dda9c2n],
	])("should match the reference digest of %j", (text, expected) => {
		expect(fnv1_64(encodeTextUtf8(text))).toBe(expected);
	});
});
