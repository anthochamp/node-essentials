import { expect, suite, test } from "vitest";
import { patternCapture, patternInOutCapture } from "./pattern-util.js";

suite("patternCapture", () => {
	test("should create a named capture group", () => {
		const pattern = patternCapture("\\d+", "number");
		expect(pattern).toBe("(?<number>\\d+)");
		const regex = new RegExp(pattern);
		const match = regex.exec("123");
		expect(match?.groups?.number).toBe("123");
	});

	test("should create a non-capturing group when no name is provided", () => {
		const pattern = patternCapture("\\d+");
		expect(pattern).toBe("(?:\\d+)");
		const regex = new RegExp(pattern);
		const match = regex.exec("123");
		expect(match?.[0]).toBe("123");
	});
});

suite("patternInOutCapture", () => {
	test("should create in-out named capture groups with pre and post patterns", () => {
		const pattern = patternInOutCapture("\\d+", {
			prePattern: "\\(",
			postPattern: "\\)",
			inCaptureName: "number",
			outCaptureName: "parenthesizedNumber",
		});
		expect(pattern).toBe("(?<parenthesizedNumber>\\((?<number>\\d+)\\))");
		const regex = new RegExp(pattern);
		const match = regex.exec("(123)");
		expect(match?.groups?.parenthesizedNumber).toBe("(123)");
		expect(match?.groups?.number).toBe("123");
	});

	test("should create non-capturing groups when no names are provided", () => {
		const pattern = patternInOutCapture("\\d+", {
			prePattern: "\\(",
			postPattern: "\\)",
		});
		expect(pattern).toBe("(?:\\((?:\\d+)\\))");
		const regex = new RegExp(pattern);
		const match = regex.exec("(123)");
		expect(match?.[0]).toBe("(123)");
	});
});
