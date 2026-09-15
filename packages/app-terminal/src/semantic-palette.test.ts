import { expect, suite, test } from "vitest";

import {
	SEMANTIC_PALETTE,
	type SemanticPalette,
	type SemanticRole,
	semanticStyle,
	styleSemanticFor,
} from "./semantic-palette.js";
import type { Terminal } from "./terminal.js";

function terminal_(colorDepth: Terminal["colorDepth"]): Terminal {
	return {
		interactive: true,
		columns: 80,
		rows: 24,
		colorDepth,
		unicode: true,
		hyperlinks: false,
		resize: { on: () => () => undefined } as unknown as Terminal["resize"],
	};
}

const ROLES: readonly SemanticRole[] = [
	"muted",
	"info",
	"success",
	"warning",
	"error",
	"critical",
	"winner",
	"better",
	"worse",
	"unchanged",
];

suite("semanticStyle", () => {
	test("gives every role a foreground", () => {
		const uncoloured = ROLES.filter(
			(role) => semanticStyle(role).foreground === undefined,
		);
		expect(uncoloured).toEqual([]);
	});

	test("reserves a background for the one role severe enough to need it", () => {
		const withBackground = ROLES.filter(
			(role) => semanticStyle(role).background !== undefined,
		);
		expect(withBackground).toEqual(["critical"]);
	});

	test("carries no SGR attributes, which stay at the call site", () => {
		expect(Object.keys(semanticStyle("winner"))).toEqual(["foreground"]);
	});

	test("reads from a caller's palette when given one", () => {
		const palette: SemanticPalette = {
			...SEMANTIC_PALETTE,
			error: { foreground: { r8: 1, g8: 2, b8: 3 } },
		};
		expect(semanticStyle("error", palette).foreground).toEqual({
			r8: 1,
			g8: 2,
			b8: 3,
		});
	});
});

suite("styleSemanticFor", () => {
	test("emits truecolor for a terminal that renders it", () => {
		expect(styleSemanticFor(terminal_(24), "x", "error")).toBe(
			"\u001B[38;2;220;50;47mx\u001B[0m",
		);
	});

	test("downsamples to the terminal's depth", () => {
		expect(styleSemanticFor(terminal_(8), "x", "error")).toMatch(
			// oxlint-disable-next-line no-control-regex -- matching the ESC that opens an SGR sequence is the assertion
			/^\u001B\[38;5;\d+mx\u001B\[0m$/,
		);
	});

	test("drops colour but keeps attributes on a monochrome terminal", () => {
		expect(
			styleSemanticFor(terminal_(1), "x", "error", { styles: ["bold"] }),
		).toBe("\u001B[1mx\u001B[0m");
	});

	test("applies the caller's attributes alongside the role's colour", () => {
		expect(
			styleSemanticFor(terminal_(24), "x", "winner", {
				styles: ["bold"],
			}),
		).toBe("\u001B[1;38;2;255;215;0mx\u001B[0m");
	});

	test("emits both channels for the role that carries a background", () => {
		expect(styleSemanticFor(terminal_(24), "x", "critical")).toBe(
			"\u001B[38;2;255;255;255;48;2;180;0;0mx\u001B[0m",
		);
	});
});
