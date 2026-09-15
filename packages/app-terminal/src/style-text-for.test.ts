import { EventDispatcherBase } from "@ac-kit/async";
import { expect, suite, test } from "vitest";

import { styleTextFor } from "./style-text-for.js";
import type { Terminal } from "./terminal.js";

function terminal(overrides?: Partial<Terminal>): Terminal {
	return {
		interactive: true,
		columns: 80,
		rows: 24,
		colorDepth: 24,
		unicode: true,
		hyperlinks: false,
		resize: new EventDispatcherBase(),
		...overrides,
	};
}

suite("styleTextFor", () => {
	test("uses truecolor codes when the terminal supports 24-bit color", () => {
		expect(
			styleTextFor(terminal({ colorDepth: 24 }), "hello", {
				foreground: { r8: 10, g8: 20, b8: 30 },
			}),
		).toBe("\u001B[38;2;10;20;30mhello\u001B[0m");
	});

	test("downsamples to the terminal's color depth", () => {
		expect(
			styleTextFor(terminal({ colorDepth: 4 }), "hello", {
				foreground: { r8: 255, g8: 0, b8: 0 },
			}),
		).toBe("\u001B[91mhello\u001B[0m");
	});
});
