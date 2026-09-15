import { expect, suite, test } from "vitest";

import { styleText } from "./color.js";

suite("styleText", () => {
	test("returns text unchanged when nothing is requested", () => {
		expect(styleText("hello", {})).toBe("hello");
	});

	test("applies a style attribute", () => {
		expect(styleText("hello", { styles: ["bold"] })).toBe(
			"\u001B[1mhello\u001B[0m",
		);
	});

	test("applies multiple style attributes in order", () => {
		expect(styleText("hello", { styles: ["bold", "underline"] })).toBe(
			"\u001B[1;4mhello\u001B[0m",
		);
	});

	test("uses truecolor codes by default", () => {
		expect(styleText("hello", { foreground: { r8: 10, g8: 20, b8: 30 } })).toBe(
			"\u001B[38;2;10;20;30mhello\u001B[0m",
		);
	});

	test("applies a background color", () => {
		expect(styleText("hello", { background: { r8: 10, g8: 20, b8: 30 } })).toBe(
			"\u001B[48;2;10;20;30mhello\u001B[0m",
		);
	});

	test("downsamples to the 256-color palette", () => {
		expect(
			styleText("hello", {
				foreground: { r8: 255, g8: 255, b8: 255 },
				colorDepth: 8,
			}),
		).toBe("\u001B[38;5;231mhello\u001B[0m");
	});

	test("downsamples to the 16-color palette", () => {
		expect(
			styleText("hello", {
				foreground: { r8: 255, g8: 0, b8: 0 },
				colorDepth: 4,
			}),
		).toBe("\u001B[91mhello\u001B[0m");

		expect(
			styleText("hello", {
				background: { r8: 255, g8: 0, b8: 0 },
				colorDepth: 4,
			}),
		).toBe("\u001B[101mhello\u001B[0m");
	});

	test("drops colors but keeps styles at colorDepth 1", () => {
		expect(
			styleText("hello", {
				styles: ["bold"],
				foreground: { r8: 255, g8: 0, b8: 0 },
				colorDepth: 1,
			}),
		).toBe("\u001B[1mhello\u001B[0m");
	});
});
