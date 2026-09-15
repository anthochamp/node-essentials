import { expect, suite, test } from "vitest";

import { createLiveRegion, isRedrawable } from "./live-region.js";
import type { Terminal } from "./terminal.js";

function terminal_(overrides?: Partial<Terminal>): Terminal {
	return {
		interactive: true,
		columns: 20,
		rows: 5,
		colorDepth: 4,
		unicode: true,
		hyperlinks: false,
		resize: { subscribe: () => () => {} } as unknown as Terminal["resize"],
		...overrides,
	};
}

const ERASE = "\u001B[0J";

suite("isRedrawable", () => {
	test("rejects a non-interactive terminal", () => {
		expect(isRedrawable(terminal_({ interactive: false }))).toBe(false);
	});

	test("rejects an unknown width, which would let a line wrap", () => {
		expect(isRedrawable(terminal_({ columns: 0 }))).toBe(false);
	});

	test("rejects a viewport with no room above the cursor", () => {
		expect(isRedrawable(terminal_({ rows: 1 }))).toBe(false);
	});

	test("accepts a terminal with a known, usable viewport", () => {
		expect(isRedrawable(terminal_())).toBe(true);
	});
});

suite("createLiveRegion", () => {
	test("writes the first frame with nothing to erase", () => {
		const region = createLiveRegion(terminal_());
		expect(region(["a", "b"])).toBe("a\nb\n");
	});

	test("erases exactly the rows the previous frame wrote", () => {
		const region = createLiveRegion(terminal_());
		region(["a", "b"]);
		expect(region(["c"])).toBe(`\u001B[2A${ERASE}c\n`);
	});

	test("keeps scrollback above the region and does not erase it later", () => {
		const region = createLiveRegion(terminal_());
		region(["a"]);
		expect(region(["b"], ["kept"])).toBe(`\u001B[1A${ERASE}kept\nb\n`);
		expect(region(["c"])).toBe(`\u001B[1A${ERASE}c\n`);
	});

	// `cursorUp` cannot reach above the viewport, so a taller region would leave
	// its own header stranded in scrollback on the next erase.
	test("clamps the region to one row less than the viewport", () => {
		const region = createLiveRegion(terminal_({ rows: 3 }));
		expect(region(["a", "b", "c", "d"])).toBe("c\nd\n");
		expect(region(["e"])).toBe(`\u001B[2A${ERASE}e\n`);
	});

	// A caller renders one item per entry — an event, a whole table — so an entry
	// holding two lines occupies two rows and the erase has to count both.
	test("counts a multi-line entry as the rows it occupies", () => {
		const region = createLiveRegion(terminal_());
		expect(region(["a\nb"])).toBe("a\nb\n");
		expect(region(["c"])).toBe(`\u001B[2A${ERASE}c\n`);
	});

	test("does not turn a trailing newline into a blank row", () => {
		const region = createLiveRegion(terminal_());
		expect(region(["a\n"])).toBe("a\n");
		expect(region(["b"])).toBe(`\u001B[1A${ERASE}b\n`);
	});

	test("clamps each line of a multi-line entry separately", () => {
		const region = createLiveRegion(terminal_({ columns: 5 }));
		expect(region(["abcdefgh\nij"])).toBe("abcd…\nij\n");
	});

	test("commits a finished region as scrollback and forgets it", () => {
		const region = createLiveRegion(terminal_());
		region(["live"]);
		expect(region([], ["final"])).toBe(`\u001B[1A${ERASE}final\n`);
		expect(region(["next"])).toBe("next\n");
	});

	test("truncates a line wider than the terminal", () => {
		const region = createLiveRegion(terminal_({ columns: 5 }));
		expect(region(["abcdefgh"])).toBe("abcd…\n");
	});

	// Measuring the styled text directly counts `[31m` as printable and cuts a
	// line that fits.
	test("leaves a styled line that fits entirely alone", () => {
		const region = createLiveRegion(terminal_({ columns: 5 }));
		expect(region(["\u001B[31mabc\u001B[0m"])).toBe("\u001B[31mabc\u001B[0m\n");
	});
});
