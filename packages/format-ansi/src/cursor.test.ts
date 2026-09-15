import { expect, suite, test } from "vitest";

import { cursorDown, cursorUp } from "./cursor.js";

suite("cursorUp/cursorDown", () => {
	test("builds a cursor-up escape sequence", () => {
		expect(cursorUp(3)).toBe("\u001B[3A");
	});

	test("builds a cursor-down escape sequence", () => {
		expect(cursorDown(2)).toBe("\u001B[2B");
	});

	test("is a no-op for a count of 0", () => {
		expect(cursorUp(0)).toBe("");
		expect(cursorDown(0)).toBe("");
	});
});
