import { encodeTextUtf8 } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { fnv1_32, fnv1a_32 } from "./fnv_32.js";

describe("fnv1a_32", () => {
	it.each([
		["", 0x811c9dc5],
		["a", 0xe40c292c],
		["foobar", 0xbf9cf968],
	])("should match the reference digest of %j", (text, expected) => {
		expect(fnv1a_32(encodeTextUtf8(text))).toBe(expected);
	});
});

describe("fnv1_32", () => {
	it.each([
		["", 0x811c9dc5],
		["a", 0x050c5d7e],
		["foobar", 0x31f0b262],
	])("should match the reference digest of %j", (text, expected) => {
		expect(fnv1_32(encodeTextUtf8(text))).toBe(expected);
	});
});
